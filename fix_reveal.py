f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

old = "    // CONTACT\n    document.getElementById('contact-note')"
new = """    // Re-observe all reveal elements after full page load
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // CONTACT
    document.getElementById('contact-note')"""

if old in c:
    open('public/index.html', 'w', encoding='utf-8').write(c.replace(old, new))
    print('Done')
else:
    print('Not found - searching...')
    idx = c.find('// CONTACT')
    print(repr(c[idx-5:idx+40]))
