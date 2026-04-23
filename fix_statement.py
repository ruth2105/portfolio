f = open('public/index.html', encoding='utf-8')
content = f.read()
f.close()

old = '''    <div class="statement-inner">
      <div class="statement-body" id="statement-body"></div>
      <blockquote class="statement-quote reveal" id="statement-quote"></blockquote>
    </div>'''

new = '''    <div class="statement-inner">
      <div class="statement-body" id="statement-body"></div>
      <div>
        <img src="/images/20260125_125225.jpg" alt="Artist Statement" class="reveal" style="width:100%;max-width:480px;border-radius:8px;object-fit:cover;margin-bottom:1.5rem;display:block;">
        <blockquote class="statement-quote reveal" id="statement-quote"></blockquote>
      </div>
    </div>'''

if old in content:
    result = content.replace(old, new)
    open('public/index.html', 'w', encoding='utf-8').write(result)
    print('Statement image added!')
else:
    print('Pattern not found')
    # show what is there
    idx = content.find('statement-inner')
    print(repr(content[idx:idx+300]))
