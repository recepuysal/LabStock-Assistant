import { useState } from 'react'
import './App.css'

function App() {
  const [query, setQuery] = useState('')

  return (
    <div className="app-shell min-h-screen w-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">LabStock Assistant</h1>
            <p className="text-sm text-slate-400">Elektronik malzeme stoku</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg shadow-slate-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">Asistan (yakında)</p>
          <h2 className="mt-2 text-xl font-medium text-white">Ne arıyorsunuz?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            İleride burada doğal dil ile arama yapabilecek ve stokta olmayan parçalar için güvenli eşdeğer önerileri
            (sizin onayınızla) gösterebilecek bir yapay zeka asistanı olacak. Şimdilik aşağıdaki arama kutusunu
            kullanarak parça adı veya MPN ile kayıtlarınızı bulacaksınız.
          </p>
        </section>

        <section>
          <label htmlFor="stock-search" className="sr-only">
            Stokta ara
          </label>
          <input
            id="stock-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Örn. LM358, 10k 0603, USB-C konnektör…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-emerald-500/0 transition focus:border-emerald-600/60 focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="mt-2 text-xs text-slate-500">
            Veritabanı bir sonraki adımda eklenecek; şu an arama yalnızca arayüz hazırlığıdır.
          </p>
        </section>

        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
          <p className="text-sm text-slate-400">Henüz kayıtlı parça yok.</p>
          <p className="mt-1 text-xs text-slate-600">Parça listesi ve ekleme formu sıradaki geliştirme adımında.</p>
        </section>
      </main>
    </div>
  )
}

export default App
