import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Network } from 'vis-network/standalone';
import './App.css';

function App() {
  const [grammarInput, setGrammarInput] = useState({
    non_terminals: 'E,T,F',
    terminals: 'id,+,,*,(,) ',
    start_symbol: 'E',
    productions: 'E → E + T\nE → T\nT → T * F\nT → F\nF → ( E )\nF → id'
  });
  const [data, setData] = useState(null);
  const [parseInput, setParseInput] = useState('id + id * id');
  const [parseResult, setParseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const graphRef = useRef(null);
  const networkRef = useRef(null);

  const steps = [
    'Group Members',
    'Grammar Input',
    'Grammar & First Sets',
    'LR(1) States',
    'LALR Minimization',
    'LALR States',
    'Parsing Tables',
    'Parse Input'
  ];

  const handleBuildGrammar = async () => {
    setLoading(true);
    try {
      const payload = {
        non_terminals: grammarInput.non_terminals.split(',').map(s => s.trim()),
        terminals: grammarInput.terminals.split(',').map(s => s.trim()),
        start_symbol: grammarInput.start_symbol.trim(),
        productions: grammarInput.productions.split('\n').map(s => s.trim()).filter(s => s)
      };
      const response = await axios.post('http://localhost:5000/build_grammar', payload);
      setData(response.data);
      setActiveStep(1);
    } catch (error) {
      alert('Error building grammar: ' + error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  const handleParse = async () => {
    if (!data) return;
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/parse', { input: parseInput });
      setParseResult(response.data);
    } catch (error) {
      alert('Error parsing: ' + error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (data && (activeStep === 3 || activeStep === 5) && graphRef.current) {
      // Destroy previous network if exists
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      const states = activeStep === 3 ? data.lr1_states : data.lalr_states;
      const transitions = activeStep === 3 ? data.lr1_transitions : data.lalr_transitions;

      const nodes = states.map(state => ({
        id: state.id,
        label: `State ${state.id}`,
        title: state.items.join('\n')
      }));

      const edges = Object.entries(transitions).map(([key, target]) => {
        const [state, symbol] = key.split(',');
        return {
          from: parseInt(state),
          to: parseInt(target),
          label: symbol,
          arrows: 'to'
        };
      });

      const options = {
        nodes: {
          shape: 'circle',
          size: 30,
          font: { size: 14 }
        },
        edges: {
          font: { size: 12, align: 'middle' },
          arrows: { to: { enabled: true, scaleFactor: 0.5 } }
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based'
        }
      };

      networkRef.current = new Network(graphRef.current, { nodes, edges }, options);
    }
  }, [data, activeStep]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>LALR Parser Visualizer</h1>
      </header>
      <div className="container">
        <div className="steps-nav">
          {steps.map((step, index) => (
            <button
              key={index}
              className={`step-btn ${activeStep === index ? 'active' : ''}`}
              onClick={() => setActiveStep(index)}
            >
              {step}
            </button>
          ))}
        </div>

        {activeStep === 0 && (
          <div className="step-content">
            <h2>Group Members</h2>
            <div className="section">
              <h3>Compiler Design Section C - Group Assignment</h3>
              <p>This LALR Parser Visualizer was developed as a group project for Compiler Design Section C.</p>

              <h4>Group Members:</h4>
              <ol style={{ fontSize: '18px', lineHeight: '2' }}>
                <li>Kidus Efrem</li>
                <li>Kaleb Mesfin</li>
                <li>Lemessa Elias</li>
                <li>Kidus Yosef</li>
              </ol>

              <p style={{ marginTop: '20px', fontStyle: 'italic' }}>
                This tool visualizes the LALR(1) parsing process, showing grammar construction,
                state generation, table building, and input parsing with detailed step-by-step explanations.
              </p>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="step-content">
            <h2>Grammar Input</h2>
            <div className="input-group">
              <label>Non-terminals (comma-separated):</label>
              <input
                type="text"
                value={grammarInput.non_terminals}
                onChange={(e) => setGrammarInput({...grammarInput, non_terminals: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Terminals (comma-separated):</label>
              <input
                type="text"
                value={grammarInput.terminals}
                onChange={(e) => setGrammarInput({...grammarInput, terminals: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Start Symbol:</label>
              <input
                type="text"
                value={grammarInput.start_symbol}
                onChange={(e) => setGrammarInput({...grammarInput, start_symbol: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Productions (one per line):</label>
              <textarea
                value={grammarInput.productions}
                onChange={(e) => setGrammarInput({...grammarInput, productions: e.target.value})}
                rows="6"
              />
            </div>
            <button onClick={handleBuildGrammar} disabled={loading}>
              {loading ? 'Building...' : 'Build Grammar'}
            </button>
          </div>
        )}

        {activeStep === 2 && data && (
          <div className="step-content">
            <h2>Grammar & First Sets</h2>
            <div className="section">
              <h3>Grammar</h3>
              <p><strong>Start Symbol:</strong> {data.grammar.start_symbol}</p>
              <ul>
                {data.grammar.productions.map((prod, i) => <li key={i}>{prod}</li>)}
              </ul>
            </div>
            <div className="section">
              <h3>First Sets</h3>
              {Object.entries(data.first_sets).map(([sym, first]) => (
                <p key={sym}><strong>FIRST({sym})</strong> = {'{'} {first.join(', ')} {'}'}</p>
              ))}
            </div>
          </div>
        )}

        {activeStep === 3 && data && (
          <div className="step-content">
            <h2>LR(1) States</h2>
            <p>These are the canonical LR(1) states before LALR minimization.</p>
            {data.lr1_states.map((state) => (
              <div key={state.id} className="state">
                <h3>State {state.id}</h3>
                <pre style={{ background: '#f9f9f9', padding: '10px', borderRadius: '5px', fontFamily: 'monospace' }}>
                  {state.items.join('\n')}
                </pre>
              </div>
            ))}
            <div className="section">
              <h3>LR(1) State Machine Graph</h3>
              <div ref={graphRef} style={{ height: '600px', border: '1px solid #ddd', borderRadius: '5px' }}></div>
            </div>
            <div className="section">
              <h3>Transitions</h3>
              <ul>
                {Object.entries(data.lr1_transitions).map(([key, target]) => (
                  <li key={key}>{key} → {target}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeStep === 4 && data && (
          <div className="step-content">
            <h2>LALR Minimization</h2>
            <p>This step shows how LR(1) states are merged into LALR(1) states by combining states with identical LR(0) cores but different lookaheads.</p>

            {data.merge_info && data.merge_info.length > 0 ? (
              <div className="section">
                <h3>State Merging Details</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {data.merge_info.map((merge, idx) => (
                    <div key={idx} style={{
                      background: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>
                        LALR State {merge.lalr_state}
                      </h4>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>Merged LR(1) States:</strong> {merge.merged_lr1_states.join(', ')}
                      </div>
                      <div>
                        <strong>Core Items:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {merge.core_items.map(([prod, dot], i) => (
                            <li key={i}>{prod} [dot at position {dot}]</li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '10px' }}>
                        These LR(1) states had identical LR(0) cores but different lookaheads.
                        LALR merging combines them by taking the union of their lookaheads.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="section">
                <p>No state merging was necessary - the LR(1) grammar is already LALR(1).</p>
              </div>
            )}

            <div className="section">
              <h3>Summary</h3>
              <p>
                <strong>LR(1) States:</strong> {data.lr1_states.length}<br />
                <strong>LALR(1) States:</strong> {data.lalr_states.length}<br />
                <strong>States Merged:</strong> {data.lr1_states.length - data.lalr_states.length}
              </p>
            </div>
          </div>
        )}

        {activeStep === 5 && data && (
          <div className="step-content">
            <h2>LALR States</h2>
            <p>These are the final LALR(1) states after merging compatible LR(1) states.</p>
            <div className="states-grid">
              {data.lalr_states.map((state) => (
                <div key={state.id} className="state-card">
                  <div className="state-header">
                    <h3>State {state.id}</h3>
                  </div>
                  <div className="state-content">
                    {state.items.map((item, idx) => (
                      <div key={idx} className="item-line">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="section">
              <h3>LALR State Machine Graph</h3>
              <div ref={graphRef} style={{ height: '600px', border: '1px solid #ddd', borderRadius: '5px' }}></div>
            </div>
            <div className="section">
              <h3>Transitions</h3>
              <ul>
                {Object.entries(data.lalr_transitions).map(([key, target]) => (
                  <li key={key}>{key} → {target}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeStep === 6 && data && (
          <div className="step-content">
            <h2>Parsing Tables</h2>

            {data.merge_info && data.merge_info.length > 0 && (
              <div className="section">
                <h3>LALR Minimization Steps</h3>
                <p>The following LR(1) states were merged into LALR(1) states:</p>
                <ul>
                  {data.merge_info.map((merge, idx) => (
                    <li key={idx}>
                      <strong>LALR State {merge.lalr_state}</strong> ← Merged LR(1) States {merge.merged_lr1_states.join(', ')}
                      <br />
                      <small>Core items: {merge.core_items.map(([prod, dot]) => `${prod} [${dot}]`).join(', ')}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="section">
              <h3>LR(1) ACTION Table</h3>
              {(() => {
                const states = Array.from({length: data.lr1_states.length}, (_, i) => i);
                const terminals = [...data.grammar.terminals, '$'];
                return (
                  <table>
                    <thead>
                      <tr>
                        <th>State</th>
                        {terminals.map(term => <th key={term}>{term}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {states.map(state => (
                        <tr key={state}>
                          <td>{state}</td>
                          {terminals.map(term => {
                            const key = `${state},${term}`;
                            const action = data.lr1_tables.ACTION[key] || '';
                            return <td key={term}>{action}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="section">
              <h3>LR(1) GOTO Table</h3>
              {(() => {
                const states = Array.from({length: data.lr1_states.length}, (_, i) => i);
                const nonTerminals = data.grammar.non_terminals;
                return (
                  <table>
                    <thead>
                      <tr>
                        <th>State</th>
                        {nonTerminals.map(nt => <th key={nt}>{nt}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {states.map(state => (
                        <tr key={state}>
                          <td>{state}</td>
                          {nonTerminals.map(nt => {
                            const key = `${state},${nt}`;
                            const nextState = data.lr1_tables.GOTO[key] || '';
                            return <td key={nt}>{nextState}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="section">
              <h3>LALR(1) ACTION Table</h3>
              {(() => {
                const states = Array.from({length: data.lalr_states.length}, (_, i) => i);
                const terminals = [...data.grammar.terminals, '$'];
                return (
                  <table>
                    <thead>
                      <tr>
                        <th>State</th>
                        {terminals.map(term => <th key={term}>{term}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {states.map(state => (
                        <tr key={state}>
                          <td>{state}</td>
                          {terminals.map(term => {
                            const key = `${state},${term}`;
                            const action = data.lalr_tables.ACTION[key] || '';
                            return <td key={term}>{action}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="section">
              <h3>LALR(1) GOTO Table</h3>
              {(() => {
                const states = Array.from({length: data.lalr_states.length}, (_, i) => i);
                const nonTerminals = data.grammar.non_terminals;
                return (
                  <table>
                    <thead>
                      <tr>
                        <th>State</th>
                        {nonTerminals.map(nt => <th key={nt}>{nt}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {states.map(state => (
                        <tr key={state}>
                          <td>{state}</td>
                          {nonTerminals.map(nt => {
                            const key = `${state},${nt}`;
                            const nextState = data.lalr_tables.GOTO[key] || '';
                            return <td key={nt}>{nextState}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {activeStep === 7 && data && (
          <div className="step-content">
            <h2>Parse Input</h2>
            <div className="input-group">
              <label>Input String:</label>
              <input
                type="text"
                value={parseInput}
                onChange={(e) => setParseInput(e.target.value)}
              />
            </div>
            <button onClick={handleParse} disabled={loading}>
              {loading ? 'Parsing...' : 'Parse'}
            </button>
            {parseResult && (
              <div className="section">
                <h3>Parsing Steps</h3>
                <p>The parser uses a stack-based approach with the LALR(1) parsing tables. Each step shows the current stack state, remaining input, and the action taken.</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Step</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Stack</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Input</th>
                      <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.steps.map((step, index) => {
                      let stack = '-', input = '-', action = '';

                      // Check if step is an object with properties
                      if (typeof step === 'object' && step !== null) {
                        stack = step.stack || step.Stack || '-';
                        input = step.input || step.Input || '-';
                        action = step.action || step.Action || '';
                      } else if (typeof step === 'string') {
                        // Parse string format: "Stack: ... | Input: ... | Action: ..."
                        const parts = step.split(' | ');
                        parts.forEach(part => {
                          if (part.toLowerCase().startsWith('stack:')) {
                            stack = part.substring(6).trim();
                          } else if (part.toLowerCase().startsWith('input:')) {
                            input = part.substring(6).trim();
                          } else if (part.toLowerCase().startsWith('action:')) {
                            action = part.substring(7).trim();
                          }
                        });
                        // If parsing failed, put everything in action
                        if (stack === '-' && input === '-' && action === '') {
                          action = step;
                        }
                      } else {
                        // Fallback
                        action = String(step);
                      }

                      return (
                        <tr key={index}>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace' }}>{stack}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace' }}>{input}</td>
                          <td style={{ border: '1px solid #ddd', padding: '8px' }}>{action}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: parseResult.success ? '#d4edda' : '#f8d7da', border: `1px solid ${parseResult.success ? '#c3e6cb' : '#f5c6cb'}`, borderRadius: '5px' }}>
                  <strong>Final Result:</strong> {parseResult.success ? '✓ Input string accepted by the grammar' : '✗ Input string rejected - syntax error'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
