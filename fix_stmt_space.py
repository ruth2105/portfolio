f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

old = '      <div>\n        <img src="/images/20260125_1'
new = '      <div style="padding-top:0;margin-top:0;">\n        <img src="/images/20260125_1'

if old in c:
    open('public/index.html', 'w', encoding='utf-8').write(c.replace(old, new))
    print('Done')
else:
    print('Not found')
