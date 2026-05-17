import fs from 'fs'
const h = fs.readFileSync('tmp-tme.html', 'utf8')

// TME technical parameters in react payload
const patterns = [
  /"name":"Type of case"[^}]*"value":"([^"]+)"/i,
  /"name":"Case[^"]*"[^}]*"value":"([^"]+)"/i,
  /"name":"Housing[^"]*"[^}]*"value":"([^"]+)"/i,
  /"name":"Package[^"]*"[^}]*"value":"([^"]+)"/i,
  /"name":"Mounting[^"]*"[^}]*"value":"([^"]+)"/i,
  /t_pip_technical[^>]*>([^<]+)/gi,
]
for (const p of patterns) {
  const m = h.match(p)
  if (m) console.log(p.source.slice(0, 40), '->', m[1] ?? m[0]?.slice(0, 80))
}

let idx = 0
while ((idx = h.indexOf('DIP8', idx)) >= 0) {
  console.log('DIP8 ctx:', h.slice(idx - 120, idx + 40).replace(/\s+/g, ' '))
  idx++
}

const paramBlock = h.match(/"parameters":\[[\s\S]{0,8000}?\]/)
if (paramBlock) console.log('params sample', paramBlock[0].slice(0, 1500))
