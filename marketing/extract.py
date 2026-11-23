"""Pull the JSON payload out of a saved browser-tool result and write it to marketing/raw/<name>.json.
Usage: python marketing/extract.py <tool-result-file> <name>"""
import json, sys
outer = json.load(open(sys.argv[1], encoding="utf-8"))
text = outer[0]["text"] if isinstance(outer, list) else outer
start = text.index("{"); end = text.rindex("}") + 1
s = text[start:end]
try:
    data = json.loads(s)
except json.JSONDecodeError:
    data = json.loads(json.loads(text[text.index('"'):text.rindex('"') + 1]))  # result came back as a quoted string
data.pop("_pad", None)
json.dump(data, open(f"marketing/raw/{sys.argv[2]}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved", sys.argv[2], {k: (len(v["rows"]) if isinstance(v, dict) and "rows" in v else type(v).__name__) for k, v in (data.get("hotels") or data).items()})
