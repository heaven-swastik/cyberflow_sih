export default function GuardrailFooter() {
  return (
    <footer className="app-footer">
      <span className="footer-item">◈ Synthetic data only — no real NCRP/I4C/bank data</span>
      <span className="footer-dot" />
      <span className="footer-item">Predictions are probabilistic, not certain</span>
      <span className="footer-dot" />
      <span className="footer-item">Locations are ranked candidate zones, not guaranteed</span>
      <span className="footer-dot" />
      <span className="footer-item">Decision support only — final actions rest with authorized agencies</span>
    </footer>
  );
}
