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
    'CLR(1) States',
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
    if (data && activeStep === 3 && graphRef.current) {
      // Destroy previous network if exists
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      const states = activeStep === 3 ? data.clr_states : data.lalr_states;
      const transitions = activeStep === 3 ? data.clr_transitions : data.lalr_transitions;

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
        <h1>CLR Parser Visualizer Group 7 Assignment</h1>
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
              <p>This CLR Parser Visualizer was developed as a group project for Compiler Design Section C.</p>

              <h4>Group Members:</h4>
              <ol style={{ fontSize: '18px', lineHeight: '2' }}>
                <li>Kidus Efrem</li>
                <li>Kaleb Mesfin</li>
                <li>Lemesa Elias</li>
                <li>Mahlet Tessema</li>
                <li>Kidus Yosef</li>
              </ol>

              <p style={{ marginTop: '20px', fontStyle: 'italic' }}>
                This tool visualizes the CLR(1) parsing process, showing grammar construction,
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
            <h2>CLR(1) States</h2>
            <p>These are the canonical LR(1) states for the CLR(1) parser.</p>
            <div className="states-grid">
              {data.clr_states.map((state) => (
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
              <h3>CLR(1) State Machine Graph</h3>
              <div ref={graphRef} style={{ height: '600px', border: '1px solid #ddd', borderRadius: '5px' }}></div>
            </div>
            <div className="section">
              <h3>Transitions</h3>
              <ul>
                {Object.entries(data.clr_transitions).map(([key, target]) => (
                  <li key={key}>{key} → {target}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeStep === 4 && data && (
          <div className="step-content">
            <h2>CLR(1) Parsing Tables</h2>

            <div className="section">
              <h3>CLR(1) ACTION Table</h3>
              {(() => {
                const states = Array.from({length: data.clr_states.length}, (_, i) => i);
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
                            const action = data.clr_tables.ACTION[key] || '';
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
              <h3>CLR(1) GOTO Table</h3>
              {(() => {
                const states = Array.from({length: data.clr_states.length}, (_, i) => i);
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
                            const nextState = data.clr_tables.GOTO[key] || '';
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

        {activeStep === 5 && data && (
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
                <p>The parser uses a stack-based approach with the CLR(1) parsing tables. Each step shows the current stack state, remaining input, and the action taken.</p>
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
