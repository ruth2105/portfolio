f = open('public/index.html', encoding='utf-8')
content = f.read()
f.close()

start = content.index('  <!-- HERO -->')
end = content.index('  <!-- GALLERY -->')

hero = """  <!-- HERO -->
  <section id="home" class="hero" style="position:relative;overflow:hidden;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:stretch;">
    <div style="display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,6vw,6rem) clamp(1.5rem,4vw,4rem);background:linear-gradient(135deg,#0a0a0a 60%,#111 100%);z-index:2;">
      <p class="reveal" id="hero-location" style="font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;opacity:.45;margin-bottom:2rem;color:#fff;"></p>
      <h1 class="reveal reveal-delay-1" id="hero-name-en" style="font-size:clamp(2.2rem,4.5vw,4.5rem);font-weight:700;color:#fff;margin-bottom:.3rem;line-height:1.05;"></h1>
      <p class="reveal reveal-delay-1" id="hero-name-am" style="font-size:clamp(.9rem,1.8vw,1.3rem);color:rgba(255,255,255,0.4);margin-bottom:.6rem;font-weight:300;"></p>
      <p class="reveal reveal-delay-2" id="hero-title-line" style="font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:2.5rem;"></p>
      <div style="width:40px;height:1px;background:rgba(255,255,255,0.2);margin-bottom:2rem;"></div>
      <p class="reveal reveal-delay-2" id="hero-quote" style="font-size:clamp(.85rem,1.4vw,1rem);font-style:italic;color:rgba(255,255,255,0.6);line-height:1.9;margin-bottom:2.5rem;max-width:420px;"></p>
      <div class="hero-btns reveal reveal-delay-3" style="margin-bottom:2rem;">
        <a href="#gallery" class="btn-primary">Enter Gallery</a>
        <a href="#statement" class="btn-ghost">Read Statement</a>
      </div>
      <div class="hero-socials reveal reveal-delay-3" id="hero-socials"></div>
    </div>
    <div style="position:relative;overflow:hidden;">
      <img src="/images/IMG_20260414_120513_967.jpg" alt="Estifanos Solomon" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;">
      <div style="position:absolute;inset:0;background:linear-gradient(to right,#0a0a0a 0%,transparent 30%);"></div>
    </div>
    <div class="hero-scroll">Scroll</div>
  </section>

  """

result = content[:start] + hero + content[end:]
open('public/index.html', 'w', encoding='utf-8').write(result)
print('Hero fixed!')
