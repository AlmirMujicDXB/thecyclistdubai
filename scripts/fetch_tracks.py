#!/usr/bin/env python3
"""Download cycle-track geometry from OpenStreetMap (Overpass API) into tracks/<id>.json.

Run by .github/workflows/tracks.yml so the website never depends on Overpass being up.
Keep the bounding boxes and filters in sync with TRACKS in index.html.
"""
import json, os, sys, time, urllib.parse, urllib.request

TRACKS = {
    "alqudra": ([24.60, 55.12, 25.02, 55.52], ['way["highway"="cycleway"]']),
    "meydan":  ([25.133, 55.262, 25.172, 55.308], ['way["highway"="cycleway"]']),
    "mushrif": ([25.190, 55.420, 25.250, 55.500], ['way["highway"~"cycleway|path|track"]["bicycle"~"designated|yes"]', 'way["mtb:scale"]']),
    "kite":    ([25.140, 55.178, 25.176, 55.215], ['way["highway"="cycleway"]']),
    "hatta":   ([24.755, 56.060, 24.860, 56.195], ['way["mtb:scale"]', 'way["highway"~"path|track|cycleway"]["bicycle"~"designated|yes"]', 'way["highway"~"path|track"]["mtb"="yes"]']),
}
# Tracks where only the largest connected network is kept (drops separate cycle paths
# inside the bounding box, e.g. Expo City / Dubai South paths near Al Qudra).
MAIN_ONLY = {"alqudra"}
# Cut tracks north of this latitude (Al Qudra starts at the BOTS start pin, 24.9989 N; nothing north of it is shown).
CLIP_NORTH = {"alqudra": 24.9988}
# Cut tracks south of this latitude (Meydan: the path south of the start pin towards Nad Al Sheba is not part of the park).
CLIP_SOUTH = {"meydan": 25.1489}
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
OUT = os.path.join(os.path.dirname(__file__), "..", "tracks")


def query(bbox, filters):
    s, w, n, e = bbox
    bb = f"({s},{w},{n},{e})"
    return "[out:json][timeout:90];(" + "".join(f"{f}{bb};" for f in filters) + ");out geom;"


def fetch(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    for attempt in range(3):
        for m in MIRRORS:
            try:
                req = urllib.request.Request(m, data=data, headers={"User-Agent": "TheCyclistDubai-Weather/1.0 (github.com/AlmirMujicDXB/thecyclistdubai)"})
                with urllib.request.urlopen(req, timeout=120) as r:
                    j = json.load(r)
                if j.get("elements") is not None:
                    return j
            except Exception as ex:  # try next mirror
                print(f"  {m}: {ex}", file=sys.stderr)
        time.sleep(20 * (attempt + 1))
    return None


def clip_north(lines, lat_max, lat_min=-90.0):
    """Split ways and keep only the parts between lat_min and lat_max."""
    out = []
    for w in lines:
        part = []
        for p in w:
            if lat_min <= p[0] <= lat_max:
                part.append(p)
            else:
                if len(part) > 1:
                    out.append(part)
                part = []
        if len(part) > 1:
            out.append(part)
    return out


def main_network(lines, tol=40.0):
    """Keep the ways that form the largest connected network (by length)."""
    import math
    k = math.cos(math.radians(25))
    def d(a, b):
        return math.hypot((a[0] - b[0]) * 111000, (a[1] - b[1]) * 111000 * k)
    n = len(lines); par = list(range(n))
    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]; x = par[x]
        return x
    for i in range(n):
        for j in range(i + 1, n):
            A, B = lines[i], lines[j]
            if any(d(e, q) < tol for e in (A[0], A[-1]) for q in B) or any(d(e, q) < tol for e in (B[0], B[-1]) for q in A):
                par[find(i)] = find(j)
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    length = lambda w: sum(d(w[t - 1], w[t]) for t in range(1, len(w)))
    best = max(groups.values(), key=lambda ids: sum(length(lines[i]) for i in ids))
    return [lines[i] for i in sorted(best)]


def main():
    os.makedirs(OUT, exist_ok=True)
    ok = 0
    for tid, (bbox, filters) in TRACKS.items():
        print(f"{tid} …")
        j = fetch(query(bbox, filters))
        if not j:
            print(f"  failed, keeping existing file")
            continue
        lines = [[[round(p["lat"], 5), round(p["lon"], 5)] for p in el["geometry"]]
                 for el in j["elements"] if el.get("geometry") and len(el["geometry"]) > 1]
        if not lines:
            print("  no ways found, keeping existing file")
            continue
        if tid in CLIP_NORTH or tid in CLIP_SOUTH:
            lines = clip_north(lines, CLIP_NORTH.get(tid, 90.0), CLIP_SOUTH.get(tid, -90.0))
        if tid in MAIN_ONLY:
            before = len(lines)
            lines = main_network(lines)
            print(f"  kept main network: {len(lines)} of {before} ways")
        with open(os.path.join(OUT, f"{tid}.json"), "w") as f:
            json.dump({"source": "OpenStreetMap contributors (ODbL)", "lines": lines}, f, separators=(",", ":"))
        print(f"  {len(lines)} ways")
        ok += 1
        time.sleep(5)
    print(f"done: {ok}/{len(TRACKS)} tracks updated")


if __name__ == "__main__":
    main()
