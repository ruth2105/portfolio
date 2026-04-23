f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

old = "        <span class=\"press-date\">${p.date||''} ${p.link?'\\u00b7 Read \\u2197':''}</span>\n      </${tag}>`"
new = "        <span class=\"press-date\">${p.date||''}</span>\n        ${p.link?`<span style=\"display:inline-block;margin-top:.75rem;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid currentColor;padding-bottom:2px;opacity:.7\">Read Article \u2197</span>`:''}\n      </${tag}>`"

idx = c.find("press-date\">${p.date")
if idx >= 0:
    segment = c[idx-8:idx+120]
    print("Found:", repr(segment))
else:
    print("Not found")
