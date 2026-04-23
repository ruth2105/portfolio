f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

old = 'statement-inner">\n      <div class="statement-body" id="statement-body"></div>\n      <div style="padding-top:0;margin-top:0;">\n        <img src="/images/20260125_125225.jpg" alt="Artist Statement" class="reveal" style="width:100%;max-width:480px;border-radius:8px;object-fit:cover;margin-bottom:1.5rem;display:block;">\n        <blockquote class="statement-quote reveal" id="statement-quote"></blockquote>\n      </div>\n    </div>'

new = 'statement-inner" style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start;max-width:1100px;">\n      <div>\n        <img src="/images/20260125_125225.jpg" alt="Artist Statement" style="width:100%;border-radius:8px;object-fit:cover;display:block;">\n      </div>\n      <div>\n        <div class="statement-body" id="statement-body"></div>\n        <blockquote class="statement-quote reveal" id="statement-quote"></blockquote>\n      </div>\n    </div>'

if old in c:
    open('public/index.html', 'w', encoding='utf-8').write(c.replace(old, new))
    print('Done')
else:
    print('Still not matching')
