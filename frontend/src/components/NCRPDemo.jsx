import React, { useState } from 'react';

export default function NCRPDemo() {
  const [formData, setFormData] = useState({
    complainantName: '',
    fraudType: 'financial_fraud',
    description: '',
    lostAmount: '',
    suspectAccount: ''
  });

  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('routing');
    
    setTimeout(async () => {
      try {
        setStatus('predicting');
        const response = await fetch('/api/integration/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'dev_test_key'
          },
          body: JSON.stringify({
            partner_id: "NCRP",
            complaint_data: formData
          })
        });
        
        const data = await response.json();
        setResult(data);
        setStatus('complete');
      } catch (err) {
        setStatus('error');
      }
    }, 1500); // Simulate routing delay for demo purposes
  };
  
  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f4f6f8',
      minHeight: '100vh',
      color: '#333'
    }}>
      {/* Gov-style header */}
      <header style={{
        backgroundColor: '#004a8b',
        color: 'white',
        padding: '1rem 2rem',
        borderBottom: '4px solid #f39c12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004a8b',
            fontWeight: 'bold', fontSize: '20px'
          }}>
            🏛️
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'normal' }}>
              National Cyber Crime Reporting Portal
            </h1>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Ministry of Home Affairs, Government of India</div>
          </div>
        </div>
        <div style={{ fontSize: '0.9rem' }}>
          Toll Free: 1930
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {status === 'idle' && (
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ color: '#004a8b', borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginTop: 0 }}>
              Report a Cyber Crime
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
              Please provide accurate details about the incident. False information is punishable under law.
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Complainant Name</label>
                <input 
                  type="text" required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '3px' }}
                  value={formData.complainantName}
                  onChange={e => setFormData({...formData, complainantName: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Incident Category</label>
                <select 
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '3px' }}
                  value={formData.fraudType}
                  onChange={e => setFormData({...formData, fraudType: e.target.value})}
                >
                  <option value="financial_fraud">Financial Fraud</option>
                  <option value="social_media">Social Media Crime</option>
                  <option value="other">Other Cyber Crime</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Lost Amount (₹)</label>
                <input 
                  type="number"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '3px' }}
                  value={formData.lostAmount}
                  onChange={e => setFormData({...formData, lostAmount: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Suspect Account Number</label>
                <input 
                  type="text"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '3px' }}
                  value={formData.suspectAccount}
                  onChange={e => setFormData({...formData, suspectAccount: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Incident Details</label>
                <textarea 
                  rows="4" required
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '3px' }}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{
                  backgroundColor: '#004a8b', color: 'white', border: 'none', padding: '0.75rem 2rem',
                  fontWeight: 'bold', borderRadius: '3px', cursor: 'pointer', fontSize: '1rem'
                }}>
                  Submit Complaint
                </button>
                <button type="button" onClick={() => window.location.href = '/'} style={{
                  backgroundColor: '#e0e0e0', color: '#333', border: 'none', padding: '0.75rem 2rem',
                  borderRadius: '3px', cursor: 'pointer', fontSize: '1rem'
                }}>
                  Return to Main App
                </button>
              </div>
            </form>
          </div>
        )}

        {(status === 'routing' || status === 'predicting') && (
          <div style={{ 
            backgroundColor: 'white', padding: '3rem 2rem', borderRadius: '4px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' 
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
            <h3 style={{ color: '#004a8b' }}>Processing Complaint...</h3>
            <p style={{ color: '#666', marginTop: '1rem', fontStyle: 'italic' }}>
              {status === 'routing' ? 'Routing to partner intelligence platform (CyberFlow API)...' : 'CyberFlow AI Engine analyzing risk...'}
            </p>
          </div>
        )}

        {status === 'complete' && result && (
          <div style={{ 
            backgroundColor: 'white', padding: '2rem', borderRadius: '4px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
          }}>
            <div style={{ 
              backgroundColor: '#e8f5e9', border: '1px solid #4caf50', color: '#2e7d32',
              padding: '1rem', borderRadius: '4px', marginBottom: '2rem', display: 'flex',
              alignItems: 'center', gap: '0.5rem', fontWeight: 'bold'
            }}>
              ✓ Complaint successfully registered (ID: {result.case_id || 'REQ-' + Math.floor(Math.random()*10000)})
            </div>

            <h3 style={{ color: '#004a8b', borderBottom: '2px solid #eee', paddingBottom: '0.5rem' }}>
              CyberFlow AI Analysis (API Response)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px', border: '1px solid #eee' }}>
                <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase' }}>Network Risk</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.network_risk > 0.6 ? '#d32f2f' : '#f57c00' }}>
                  {result.network_risk ? (result.network_risk * 100).toFixed(1) + '%' : 'N/A'}
                </div>
              </div>
              
              <div style={{ backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px', border: '1px solid #eee' }}>
                <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase' }}>Intervention Priority</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: result.intervention_priority === 'HIGH' ? '#d32f2f' : '#333' }}>
                  {result.intervention_priority || 'Pending'}
                </div>
              </div>
            </div>

            {result.location_candidates?.[0] && (
              <div style={{ marginTop: '1rem', backgroundColor: '#e3f2fd', padding: '1rem', borderRadius: '4px', border: '1px solid #bbdefb' }}>
                <div style={{ fontSize: '0.85rem', color: '#1565c0', textTransform: 'uppercase', fontWeight: 'bold' }}>Alert: Predicted Cashout Zone</div>
                <div style={{ color: '#0d47a1' }}>The funds are highly likely to be cashed out in <strong>{result.location_candidates[0].zone_id.replace(/_/g, ' ').toUpperCase()}</strong>.</div>
                {result.next_action?.predicted && (
                  <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#0d47a1', opacity: 0.8 }}>
                    Recommended action: {result.next_action.predicted.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button onClick={() => setStatus('idle')} style={{
                backgroundColor: '#004a8b', color: 'white', border: 'none', padding: '0.75rem 2rem',
                borderRadius: '3px', cursor: 'pointer', fontSize: '1rem'
              }}>
                File Another Complaint
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
