import { motion } from 'framer-motion';

const STEPS = [
  {
    n: '1',
    icon: '📝',
    title: 'Complaint arrives — and is validated',
    plain: 'A victim reports a fraud, NCRP-style. Before anything else runs, every case is checked for missing fields, duplicate transactions, and broken relationships — and if there isn\'t enough transaction history to trust a prediction, the system says so instead of guessing.',
  },
  {
    n: '2',
    icon: '🔗',
    title: 'System connects the dots',
    plain: 'The database links the complaint to the account, its transactions, the device behind them, and the ATMs that account has used before — then engineers 42 behavioural features from that network.',
  },
  {
    n: '3',
    icon: '📊',
    title: 'Statistically tested, not just modeled',
    plain: 'We run correlation and significance tests across those 42 features on 1,000 cases first. Result: transaction amount alone is NOT statistically significant (p = 0.72) — but device consistency and account reuse are (p < 0.001). That\'s why CyberFlow never flags on amount alone.',
  },
  {
    n: '4',
    icon: '🧠',
    title: 'AI predicts what happens next — and shows its work',
    plain: 'A trained model scores where and when the fraud network is likely to withdraw the money, and every prediction ships with the exact features that drove it. Tested on held-out legitimate-business cases: 0 false positives.',
  },
  {
    n: '5',
    icon: '📍',
    title: 'Prediction becomes a specific place',
    plain: 'The prediction is resolved down to real, ranked ATMs on a map — not just "somewhere in this city" — with a transparent, weighted reason for every ATM in the shortlist.',
  },
  {
    n: '6',
    icon: '📣',
    title: 'Alert goes out',
    plain: 'A tamper-evident, hash-chained alert is generated for the bank / law-enforcement team — before the money is withdrawn, not after.',
  },
];

export default function HowItWorks() {
  return (
    <motion.section
      className="how-it-works"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="hiw-header">
        <div>
          <div className="hiw-eyebrow">What CyberFlow actually does</div>
          <div className="hiw-headline">
            Most systems tell you where a crime <em>already happened</em>. CyberFlow tries to tell
            you where the money is going <em>next</em> — before it's withdrawn.
          </div>
        </div>
      </div>

      <div className="hiw-steps">
        {STEPS.map((s, i) => (
          <div className="hiw-step" key={s.n}>
            <div className="hiw-step-top">
              <span className="hiw-step-num">{s.n}</span>
              <span className="hiw-step-icon">{s.icon}</span>
            </div>
            <div className="hiw-step-title">{s.title}</div>
            <div className="hiw-step-plain">{s.plain}</div>
            {i < STEPS.length - 1 && <span className="hiw-step-arrow">→</span>}
          </div>
        ))}
      </div>

      <div className="hiw-footnote">
        <strong>Everything you'll see below is a live, working demo</strong> — real database
        joins, a real trained model with real evaluation numbers (not slide claims), and a real map —
        running on synthetic data. Nothing here is connected to NCRP, I4C, or any bank. Click{' '}
        <strong>"Run Incident Simulation"</strong> below to watch this exact flow play out
        automatically, start to finish — or file your own complaint and pick the "legitimate
        transaction" or "limited evidence" options to see the safeguards trigger live.
      </div>
    </motion.section>
  );
}
