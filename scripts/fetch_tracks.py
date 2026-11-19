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
        with open(os.path.join(OUT, f"{tid}.json"), "w") as f:
            json.dump({"source": "OpenStreetMap contributors (ODbL)", "lines": lines}, f, separators=(",", ":"))
        print(f"  {len(lines)} ways")
        ok += 1
        time.sleep(5)
    print(f"done: {ok}/{len(TRACKS)} tracks updated")


if __name__ == "__main__":
    main()
