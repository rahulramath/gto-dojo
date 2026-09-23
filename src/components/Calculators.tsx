import { useState } from "react";
import { parseCards, type Card } from "../lib/cards";
import { combosFromWeights, equityVsRange, handVsHand } from "../lib/equity";
import { parseWeights } from "../lib/ranges";
import { pct } from "../lib/format";

const inputCls = "mt-1 h-12 w-full rounded-xl border border-white/10 bg-ink-800 px-4 text-base text-ink-100 outline-none focus:border-gold-400/60";

function Result({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card-flat !p-4">
      <div className="t-label">{label}</div>
      <div className="num t-title-lg text-gold-200">{value}</div>
      <div className="t-label">{note}</div>
    </div>
  );
}

export function PotCalc() {
  const [pot, setPot] = useState(100);
  const [bet, setBet] = useState(75);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="t-label">
          Pot
          <input type="number" value={pot} min={1} onChange={(e) => setPot(Math.max(1, Number(e.target.value)))} className={inputCls} />
        </label>
        <label className="t-label">
          Bet
          <input type="number" value={bet} min={0} onChange={(e) => setBet(Math.max(0, Number(e.target.value)))} className={inputCls} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Result label="Equity you need to call" value={pct(bet / (pot + 2 * bet), 1)} note="call ÷ (pot + 2 × bet)" />
        <Result label="Minimum defense" value={pct(pot / (pot + bet), 1)} note="pot ÷ (pot + bet)" />
        <Result label="Folds a bluff needs" value={pct(bet / (pot + bet), 1)} note="bet ÷ (pot + bet)" />
        <Result label="Bluffs in a balanced bet" value={pct(bet / (pot + 2 * bet), 1)} note="bet ÷ (pot + 2 × bet)" />
      </div>
    </div>
  );
}

export function EquityCalc() {
  const [hero, setHero] = useState("AhKh");
  const [villain, setVillain] = useState("QQ+, AK, AQs");
  const [board, setBoard] = useState("");
  const [res, setRes] = useState<{ eq: number; err?: string } | null>(null);
  const run = () => {
    try {
      const h = parseCards(hero);
      if (h.length !== 2) throw new Error("Enter two cards, like AhKh.");
      const b = board.trim() ? parseCards(board) : [];
      if (b.length > 5 || b.length === 1 || b.length === 2) throw new Error("The board needs 0, 3, 4 or 5 cards.");
      const all = [...h, ...b];
      if (new Set(all).size !== all.length) throw new Error("One of those cards is used twice.");
      const vCards = villain.replace(/[\s,]/g, "");
      const eq = /^([2-9TJQKA][shdc]){2}$/i.test(vCards)
        ? handVsHand(h as [Card, Card], parseCards(vCards) as [Card, Card], b, 20000).equity
        : equityVsRange(h as [Card, Card], b, combosFromWeights(parseWeights(villain)), 20000).equity;
      setRes({ eq });
    } catch (e) {
      setRes({ eq: 0, err: e instanceof Error ? e.message : "Something doesn't look right. Check the cards." });
    }
  };
  return (
    <div className="space-y-4">
      <label className="t-label block">
        Your hand
        <input value={hero} onChange={(e) => setHero(e.target.value)} className={inputCls} />
      </label>
      <label className="t-label block">
        Their hand or range, like QQ+, AK
        <input value={villain} onChange={(e) => setVillain(e.target.value)} className={inputCls} />
      </label>
      <label className="t-label block">
        Board (optional)
        <input value={board} placeholder="Kh7h2d" onChange={(e) => setBoard(e.target.value)} className={inputCls} />
      </label>
      <button className="btn-filled btn-lg w-full" onClick={run}>
        Calculate
      </button>
      {res && (
        <div className="card-flat text-center">
          {res.err ? <span className="t-body text-rose-300">{res.err}</span> : <span className="num t-headline text-gold-200">{pct(res.eq, 1)}</span>}
        </div>
      )}
    </div>
  );
}

export function OutsCalc() {
  const [outs, setOuts] = useState(9);
  const byRiver = 1 - ((47 - outs) / 47) * ((46 - outs) / 46);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="t-body">Outs</span>
        <span className="num t-title-lg">{outs}</span>
      </div>
      <input type="range" min={1} max={20} value={outs} onChange={(e) => setOuts(Number(e.target.value))} className="w-full accent-[#f2c14e]" />
      <div className="grid grid-cols-2 gap-2">
        <Result label="Next card" value={pct(outs / 47, 1)} note={`The rule of 2 says about ${outs * 2}%`} />
        <Result label="By the river" value={pct(byRiver, 1)} note={`The rule of 4 says about ${Math.min(100, outs * 4)}%`} />
      </div>
    </div>
  );
}
