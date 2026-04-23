f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

old = '    <!-- RIGHT: Artist photo, no text on face -->\n    <div style="position:relative;overflow:hidden;">\n      <img src="/images/IMG_20260414_120513_967.jpg" alt="Estifanos Solomon" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;">\n      <div style="position:absolute;inset:0;background:linear-gradient(to right,#0a0a0a 0%,transparent 30%);"></div>\n    </div>'

new = '    <!-- RIGHT: Artist photo with blur -->\n    <div style="position:relative;overflow:hidden;">\n      <img src="/images/IMG_20260414_120513_967.jpg" alt="Estifanos Solomon" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;filter:blur(2px);transform:scale(1.05);">\n      <div style="position:absolute;inset:0;background:linear-gradient(to right,#0a0a0a 0%,transparent 35%);"></div>\n    </div>'

if old in c:
    open('public/index.html', 'w', encoding='utf-8').write(c.replace(old, new))
    print('Done')
else:
    print('Not found')
    idx = c.find('RIGHT: Artist')
    print(repr(c[idx:idx+300]))
