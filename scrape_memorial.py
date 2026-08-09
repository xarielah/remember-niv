# -*- coding: utf-8 -*-
"""
scrape_memorial.py
------------------
Scrapes visitor dedications from an FXP profile and builds an ordered JSON file
(newest -> oldest), including the name color (usernameColor) pulled straight
from the raw HTML.

The script is run by refresh_memorial.bat, but can also be run directly:
    python scrape_memorial.py --user 1206586 --start 1 --end 11 --out memorial_messages.json

"""

import argparse
from datetime import date
import json
import re
import sys
import time
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup, Tag
except ImportError:
    print("Missing libraries. Run: pip install requests beautifulsoup4", file=sys.stderr)
    sys.exit(2)


# Maps common gif smilies to emoji so the text stays readable and matches the previous format.
SMILEY_MAP = {
    "throb": "❤️", "לב": "❤️", "loveyou": "❤️",
    "sad": "😢", "cry": "😭", "cry_1": "😭",
    "mushy": "🥰",
}
DATE_RE = re.compile(r"\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}")
UID_RE = re.compile(r"[?&]u=(\d+)")


def build_session():
    s = requests.Session()
    s.headers.update({
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/125.0 Safari/537.36"),
        "Accept-Language": "he,en;q=0.9",
    })
    # If the site blocks anonymous requests, cookies from a logged-in browser can be added here:
    # s.cookies.update({"bb_sessionhash": "...", "bb_userid": "...", "bb_password": "..."})
    return s


def page_url(user_id: str, page: int) -> str:
    base = f"https://www.fxp.co.il/member.php?u={user_id}&tab=visitor_messaging"
    # Page 1 = the base URL (without page) — that is where the site's "first" link points,
    # and it avoids the odd behavior observed when explicitly requesting page=1.
    if page > 1:
        base += f"&page={page}"
    return base + "#visitor_messaging"


def uid_from_href(href):
    m = UID_RE.search(href or "")
    return m.group(1) if m else None


# def extract_color(anchor: Tag):
#     """Extracts the name color from inline style on the anchor / inner span / strong / close parent."""
#     if anchor is None:
#         return None
#     candidates = [anchor]
#     candidates += anchor.find_all(["span", "strong", "b", "font"])
#     if anchor.parent is not None:
#         candidates.append(anchor.parent)
#     for c in candidates:
#         if not hasattr(c, "get"):
#             continue
#         style = c.get("style", "") or ""
#         m = re.search(r"color\s*:\s*([^;]+)", style, re.I)
#         if m:
#             return m.group(1).strip()
#         if c.name == "font" and c.get("color"):
#             return c["color"].strip()
#     return None


def node_to_text(node: Tag) -> str:
    """Turns a message body into text: <br> -> newline, smiley/image -> a readable tag."""
    parts = []
    for el in node.descendants:
        if isinstance(el, str):
            parts.append(el)
        elif isinstance(el, Tag):
            if el.name == "br":
                parts.append("\n")
            elif el.name == "img":
                src = el.get("src", "") or ""
                title = (el.get("title") or el.get("alt") or "").strip().lower()
                if "smilies" in src or "smilie" in src:
                    emoji = None
                    for key, val in SMILEY_MAP.items():
                        if key in title or key in src.lower():
                            emoji = val
                            break
                    parts.append(emoji or "[אימוג'י]")
                else:
                    parts.append("[תמונה]")
    text = "".join(parts)
    # Clean up extra whitespace while preserving line breaks
    lines = [ln.strip() for ln in text.splitlines()]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def find_message_blocks(soup: BeautifulSoup):
    """Locates the visitor message items in a way that is resilient to template changes."""
    container = (soup.select_one("#vmessagelist")
                 or soup.select_one("#vmessage")
                 or soup.select_one("ol#messagelist")
                 or soup)
    blocks = container.select("li[id^=vmessage], li.vmessage, li[id^=vm_], li.postbitvm")
    if blocks:
        return blocks
    # fallback: any li that contains both a profile link and a blockquote/message content
    out = []
    for li in container.find_all("li"):
        if li.select_one("a[href*='member.php?u=']") and \
           (li.select_one("blockquote") or li.select_one(".postcontent, .vm_message, .message")):
            out.append(li)
    return out


def parse_block(li: Tag):
    """Returns a dict for a single record, or None if it does not look like a visitor message."""
    anchor = li.select_one("a[href*='member.php?u=']")
    if not anchor:
        return None
    uid = uid_from_href(anchor.get("href"))
    if not uid:
        return None
    username = anchor.get_text(strip=True)
    # color = extract_color(anchor)

    # Date
    posted = None
    date_node = li.select_one(".postdate, .date, .posthead, .vmheader")
    search_text = date_node.get_text(" ", strip=True) if date_node else li.get_text(" ", strip=True)
    m = DATE_RE.search(search_text)
    if m:
        posted = m.group(0)

    # Message body
    body = (li.select_one("blockquote.postcontent")
            or li.select_one("blockquote")
            or li.select_one(".vm_message")
            or li.select_one(".postcontent, .message"))
    content = node_to_text(body) if body else ""

    return {
        "username": username,
        "usernameColor": None, # support later if needed: color,
        "content": content,
        "postedAt": posted,
        "usernameUrl": f"https://www.fxp.co.il/member.php?u={uid}",
    }


def main():
    today = date.today().isoformat()
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="1206586")
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=11)
    ap.add_argument("--out", default=f"./scrape/memorial_messages_from_{today}.json")
    ap.add_argument("--delay", type=float, default=1.0, help="delay between pages (seconds)")
    ap.add_argument("--trim-last", type=int, default=4,
                    help="drop this many records from the end of the result (site boilerplate)")
    args = ap.parse_args()

    if args.start < 1 or args.end < args.start:
        print("Invalid page range.", file=sys.stderr)
        sys.exit(1)

    session = build_session()
    all_rows = []
    seen = set()  # to avoid duplicates

    for page in range(args.start, args.end + 1):
        url = page_url(args.user, page)
        print(f"Page {page}: {url}")
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
        except requests.RequestException as e:
            print(f"  Error on page {page}: {e} — continuing.", file=sys.stderr)
            continue

        soup = BeautifulSoup(r.text, "html.parser")
        blocks = find_message_blocks(soup)
        page_rows = []
        for li in blocks:
            rec = parse_block(li)
            if not rec:
                continue
            key = (rec["usernameUrl"], rec["postedAt"], rec["content"])
            if key in seen:
                continue
            seen.add(key)
            page_rows.append(rec)

        print(f"  Collected {len(page_rows)} dedications")
        if not page_rows:
            print(f"  No dedications on page {page} — probably past the end of the range, stopping.")
            break
        all_rows.extend(page_rows)
        time.sleep(args.delay)

    # The last few records are always the site's own boilerplate items — drop them.
    if args.trim_last > 0:
        dropped = min(args.trim_last, len(all_rows))
        if dropped:
            all_rows = all_rows[:-dropped]
            print(f"\nDropped the last {dropped} record(s) from the result.")

    out_path = Path(args.out)
    # Create the output folder (e.g. ./scrape) if it does not exist; if it does, do nothing.
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(all_rows, ensure_ascii=False, indent=2), encoding="utf-8")

    colored = sum(1 for r in all_rows if r.get("usernameColor"))
    print(f"\nA total of {len(all_rows)} dedications saved to: {out_path.resolve()}")
    print(f"Of those, {colored} have a name color.")


if __name__ == "__main__":
    main()