f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

# Find and replace the full statement-inner block
start = c.find('    <div class="statement-inner"')
end = c.find('  </section>', start) 
old = c[start:end]

new = '''    <div class="statement-inner" style="display:grid;grid-template-columns:1fr 1.4fr;gap:5rem;align-items:start;max-width:1200px;">
      <div>
        <img src="/images/20260125_125225.jpg" alt="Artist Statement" style="width:100%;border-radius:4px;object-fit:cover;display:block;">
      </div>
      <div>
        <p style="font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;opacity:.45;margin-bottom:1.5rem;">The Statement</p>
        <div class="statement-body" id="statement-body"></div>
        <blockquote class="statement-quote reveal" id="statement-quote"></blockquote>
      </div>
    </div>
  '''

print('Old block:')
print(repr(old[:100]))
c = c[:start] + new + c[end:]
open('public/index.html', 'w', encoding='utf-8').write(c)
print('Done')
