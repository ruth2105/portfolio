f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

old = "    // GALLERY\n    document.getElementById('galleryGrid').innerHTML = gallery.map(g => `"
new = "    // GALLERY - sort by area ascending\n    const area = d => { if(!d) return 999999; const m=d.match(/([\\d.]+)[x*]([\\d.]+)/i); return m?parseFloat(m[1])*parseFloat(m[2]):999999; };\n    gallery.sort((a,b) => area(a.dimensions) - area(b.dimensions));\n    document.getElementById('galleryGrid').innerHTML = gallery.map(g => `"

if old in c:
    c = c.replace(old, new)
    open('public/index.html', 'w', encoding='utf-8').write(c)
    print('Done - gallery sort added')
else:
    print('Pattern not found')
