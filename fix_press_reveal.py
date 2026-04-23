f = open('public/index.html', encoding='utf-8')
c = f.read()
f.close()

# Remove reveal class from press cards so they always show
old = 'class="press-card press-card-link reveal"'
new = 'class="press-card press-card-link"'

count = c.count(old)
print(f'Found {count} occurrences')

c = c.replace(old, new)
open('public/index.html', 'w', encoding='utf-8').write(c)
print('Done')
