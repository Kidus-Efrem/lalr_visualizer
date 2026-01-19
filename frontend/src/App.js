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
  const [toast, setToast] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
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

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const handleBuildGrammar = async () => {
    setLoading(true);
    try {
      const payload = {
        non_terminals: grammarInput.non_terminals.split(',').map(s => s.trim()).filter(s => s),
        terminals: grammarInput.terminals.split(',').map(s => s.trim()).filter(s => s),
        start_symbol: grammarInput.start_symbol.trim(),
        productions: grammarInput.productions.split('\n').map(s => s.trim()).filter(s => s)
      };
      
      if (!payload.start_symbol || payload.productions.length === 0) {
        showToast('Please fill in all required fields', 'error');
        setLoading(false);
        return;
      }

      const response = await axios.post('http://localhost:5000/build_grammar', payload);
      setData(response.data);
      setActiveStep(2);
      showToast('Grammar built successfully!', 'success');
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      showToast(`Error building grammar: ${errorMsg}`, 'error');
    }
    setLoading(false);
  };

  const handleParse = async () => {
    if (!data) {
      showToast('Please build grammar first', 'error');
      return;
    }
    if (!parseInput.trim()) {
      showToast('Please enter an input string', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/parse', { input: parseInput });
      setParseResult(response.data);
      if (response.data.success) {
        showToast('Input parsed successfully!', 'success');
      } else {
        showToast('Input rejected - syntax error', 'error');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      showToast(`Error parsing: ${errorMsg}`, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (data && activeStep === 3 && graphRef.current) {
      // Destroy previous network if exists
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      const states = data.clr_states;
      const transitions = data.clr_transitions;

      const nodes = states.map(state => ({
        id: state.id,
        label: `S${state.id}`,
        title: `State ${state.id}\n\n${state.items.join('\n')}`,
        color: selectedState === state.id ? { background: '#667eea', border: '#764ba2' } : { background: '#ffffff', border: '#667eea' },
        font: { size: 16, color: selectedState === state.id ? '#ffffff' : '#333' },
        borderWidth: selectedState === state.id ? 3 : 2
      }));

      const edges = Object.entries(transitions).map(([key, target]) => {
        const [state, symbol] = key.split(',');
        return {
          from: parseInt(state),
          to: parseInt(target),
          label: symbol.trim(),
          arrows: 'to',
          color: { color: '#667eea', highlight: '#764ba2' },
          font: { size: 12, align: 'middle', color: '#333' }
        };
      });

      const options = {
        nodes: {
          shape: 'circle',
          size: 35,
          font: { size: 16 },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          font: { size: 12, align: 'middle' },
          arrows: { to: { enabled: true, scaleFactor: 0.8 } },
          smooth: { type: 'curvedCW', roundness: 0.2 }
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 200,
            springConstant: 0.08,
            damping: 0.4
          }
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true
        }
      };

      const network = new Network(graphRef.current, { nodes, edges }, options);
      
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          setSelectedState(parseInt(params.nodes[0]));
        } else {
          setSelectedState(null);
        }
      });

      networkRef.current = network;
    }
  }, [data, activeStep, selectedState]);

  return (
    <div className="App">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="toast-close">×</button>
        </div>
      )}
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
          <div className="step-content group-members-content">
            <div className="group-header">
              <h2>Group Members</h2>
              <div className="project-badge">Group 7</div>
            </div>
            
            <div className="section">
              <div className="project-info">
                <h3>Compiler Design Section C - Group Assignment</h3>
                <p className="project-description">
                  This CLR Parser Visualizer was developed as a group project for Compiler Design Section C.
                  The tool visualizes the CLR(1) parsing process, showing grammar construction,
                  state generation, table building, and input parsing with detailed step-by-step explanations.
                </p>
              </div>

              <div className="members-section">
                <h4 className="members-title">
                  <span className="title-icon">👥</span>
                  Team Members
                </h4>
                <div className="members-grid">
                  {[
                    { name: 'Kidus Efrem', role: 'Team Member' },
                    { name: 'Kaleb Mesfin', role: 'Team Member' },
                    { name: 'Lemesa Elias', role: 'Team Member' },
                    { name: 'Mahlet Tessema', role: 'Team Member' },
                    { name: 'Kidus Yosef', role: 'Team Member' }
                  ].map((member, index) => (
                    <div key={index} className="member-card">
                      <div className="member-avatar">
                        {member.name.charAt(0)}
                      </div>
                      <div className="member-info">
                        <h5 className="member-name">{member.name}</h5>
                        <p className="member-role">{member.role}</p>
                      </div>
                      <div className="member-number">{index + 1}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="project-features">
                <h4 className="features-title">
                  <span className="title-icon">✨</span>
                  Project Features
                </h4>
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="feature-icon">📝</div>
                    <h5>Grammar Input</h5>
                    <p>Define custom grammars with ease</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">🔍</div>
                    <h5>FIRST Sets</h5>
                    <p>Compute and visualize FIRST sets</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">📊</div>
                    <h5>State Generation</h5>
                    <p>Build CLR(1) and LALR(1) states</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">📋</div>
                    <h5>Parsing Tables</h5>
                    <p>Generate ACTION and GOTO tables</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">🎯</div>
                    <h5>Input Parsing</h5>
                    <p>Parse strings step-by-step</p>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">📈</div>
                    <h5>Visualization</h5>
                    <p>Interactive state machine graphs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 1 && (
          <div className="step-content">
            <h2>Grammar Input</h2>
            <p className="help-text">Enter your grammar definition below. All fields are required.</p>
            <div className="input-group">
              <label>Non-terminals (comma-separated):</label>
              <input
                type="text"
                value={grammarInput.non_terminals}
                onChange={(e) => setGrammarInput({...grammarInput, non_terminals: e.target.value})}
                placeholder="E.g., E,T,F"
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label>Terminals (comma-separated):</label>
              <input
                type="text"
                value={grammarInput.terminals}
                onChange={(e) => setGrammarInput({...grammarInput, terminals: e.target.value})}
                placeholder="E.g., id,+,*,(,)"
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label>Start Symbol:</label>
              <input
                type="text"
                value={grammarInput.start_symbol}
                onChange={(e) => setGrammarInput({...grammarInput, start_symbol: e.target.value})}
                placeholder="E.g., E"
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label>Productions (one per line):</label>
              <textarea
                value={grammarInput.productions}
                onChange={(e) => setGrammarInput({...grammarInput, productions: e.target.value})}
                rows="8"
                placeholder="E → E + T&#10;E → T&#10;T → T * F&#10;T → F&#10;F → ( E )&#10;F → id"
                disabled={loading}
              />
            </div>
            <button onClick={handleBuildGrammar} disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Building...
                </>
              ) : (
                'Build Grammar'
              )}
            </button>
          </div>
        )}

        {activeStep === 2 && data && (
          <div className="step-content">
            <h2>Grammar & First Sets</h2>
            <div className="section">
              <div className="section-header">
                <h3>Grammar</h3>
                <button onClick={() => copyToClipboard(data.grammar.productions.join('\n'))} className="btn-icon" title="Copy grammar">
                  📋
                </button>
              </div>
              <div className="info-box">
                <strong>Start Symbol:</strong> <span className="highlight">{data.grammar.start_symbol}</span>
              </div>
              <div className="productions-list">
                {data.grammar.productions.map((prod, i) => (
                  <div key={i} className="production-item">
                    <span className="production-number">{i + 1}.</span>
                    <code>{prod}</code>
                  </div>
                ))}
              </div>
            </div>
            <div className="section">
              <div className="section-header">
                <h3>First Sets</h3>
                <button onClick={() => copyToClipboard(JSON.stringify(data.first_sets, null, 2))} className="btn-icon" title="Copy first sets">
                  📋
                </button>
              </div>
              <div className="first-sets-grid">
                {Object.entries(data.first_sets).map(([sym, first]) => (
                  <div key={sym} className="first-set-card">
                    <strong>FIRST({sym})</strong>
                    <div className="first-set-values">
                      {'{'} {first.map((f, idx) => (
                        <span key={idx} className="first-value">{f}{idx < first.length - 1 ? ', ' : ''}</span>
                      ))} {'}'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && data && (
          <div className="step-content">
            <h2>CLR(1) States</h2>
            <p className="help-text">These are the canonical LR(1) states for the CLR(1) parser. Click on a state in the graph to highlight it.</p>
            <div className="section">
              <div className="section-header">
                <h3>CLR(1) State Machine Graph</h3>
                <div className="graph-controls">
                  <button onClick={() => networkRef.current?.fit()} className="btn-small" title="Fit to screen">
                    🔍 Fit
                  </button>
                </div>
              </div>
              <div ref={graphRef} className="graph-container"></div>
              {selectedState !== null && (
                <div className="selected-state-info">
                  <strong>Selected State {selectedState}:</strong>
                  <div className="state-items-preview">
                    {data.clr_states[selectedState]?.items.map((item, idx) => (
                      <code key={idx}>{item}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="section">
              <div className="section-header">
                <h3>State Details</h3>
                <span className="state-count">{data.clr_states.length} states</span>
              </div>
              <div className="states-grid">
                {data.clr_states.map((state) => (
                  <div 
                    key={state.id} 
                    className={`state-card ${selectedState === state.id ? 'selected' : ''}`}
                    onClick={() => setSelectedState(state.id)}
                  >
                    <div className="state-header">
                      <h3>State {state.id}</h3>
                      <span className="item-count">{state.items.length} items</span>
                    </div>
                    <div className="state-content">
                      {state.items.map((item, idx) => (
                        <div key={idx} className="item-line">
                          <code>{item}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="section">
              <div className="section-header">
                <h3>Transitions</h3>
                <button onClick={() => copyToClipboard(JSON.stringify(data.clr_transitions, null, 2))} className="btn-icon" title="Copy transitions">
                  📋
                </button>
              </div>
              <div className="transitions-list">
                {Object.entries(data.clr_transitions).map(([key, target]) => (
                  <div key={key} className="transition-item">
                    <code>{key}</code> <span className="arrow">→</span> <strong>{target}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeStep === 4 && data && (
          <div className="step-content">
            <h2>CLR(1) Parsing Tables</h2>
            <p className="help-text">Use these tables to parse input strings. Scroll horizontally to view all columns.</p>

            <div className="section">
              <div className="section-header">
                <h3>CLR(1) ACTION Table</h3>
                <button onClick={() => {
                  const table = document.querySelector('.action-table');
                  if (table) copyToClipboard(table.innerText);
                }} className="btn-icon" title="Copy table">
                  📋
                </button>
              </div>
              <div className="table-wrapper">
                {(() => {
                  const states = Array.from({length: data.clr_states.length}, (_, i) => i);
                  const terminals = [...data.grammar.terminals, '$'];
                  return (
                    <table className="action-table">
                      <thead>
                        <tr>
                          <th className="sticky-col">State</th>
                          {terminals.map(term => <th key={term}>{term}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {states.map(state => (
                          <tr key={state}>
                            <td className="sticky-col state-cell">{state}</td>
                            {terminals.map(term => {
                              const key = `${state},${term}`;
                              const action = data.clr_tables.ACTION[key] || '';
                              const actionType = action.startsWith('S') ? 'shift' : action.startsWith('R') ? 'reduce' : action === 'ACC' ? 'accept' : '';
                              return (
                                <td key={term} className={`action-cell ${actionType}`}>
                                  {action || '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <h3>CLR(1) GOTO Table</h3>
                <button onClick={() => {
                  const table = document.querySelector('.goto-table');
                  if (table) copyToClipboard(table.innerText);
                }} className="btn-icon" title="Copy table">
                  📋
                </button>
              </div>
              <div className="table-wrapper">
                {(() => {
                  const states = Array.from({length: data.clr_states.length}, (_, i) => i);
                  const nonTerminals = data.grammar.non_terminals;
                  return (
                    <table className="goto-table">
                      <thead>
                        <tr>
                          <th className="sticky-col">State</th>
                          {nonTerminals.map(nt => <th key={nt}>{nt}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {states.map(state => (
                          <tr key={state}>
                            <td className="sticky-col state-cell">{state}</td>
                            {nonTerminals.map(nt => {
                              const key = `${state},${nt}`;
                              const nextState = data.clr_tables.GOTO[key] || '';
                              return (
                                <td key={nt} className="goto-cell">
                                  {nextState || '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeStep === 5 && data && (
          <div className="step-content">
            <h2>Parse Input</h2>
            <p className="help-text">Enter an input string to parse using the CLR(1) parsing tables.</p>
            <div className="input-group">
              <label>Input String:</label>
              <input
                type="text"
                value={parseInput}
                onChange={(e) => setParseInput(e.target.value)}
                placeholder="E.g., id + id * id"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleParse()}
              />
            </div>
            <button onClick={handleParse} disabled={loading} className="btn-primary">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Parsing...
                </>
              ) : (
                'Parse'
              )}
            </button>
            {parseResult && (
              <div className="section">
                <div className="section-header">
                  <h3>Parsing Steps</h3>
                  <button onClick={() => copyToClipboard(parseResult.steps.join('\n'))} className="btn-icon" title="Copy steps">
                    📋
                  </button>
                </div>
                <p className="help-text">The parser uses a stack-based approach with the CLR(1) parsing tables. Each step shows the current stack state, remaining input, and the action taken.</p>
                <div className="table-wrapper">
                  <table className="parse-steps-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Stack</th>
                        <th>Input</th>
                        <th>Action</th>
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

                        const actionType = action.toLowerCase().includes('shift') ? 'shift' : 
                                         action.toLowerCase().includes('reduce') ? 'reduce' : 
                                         action.toLowerCase().includes('accept') ? 'accept' : '';

                        return (
                          <tr key={index} className={actionType}>
                            <td className="step-number">{index + 1}</td>
                            <td className="stack-cell"><code>{stack}</code></td>
                            <td className="input-cell"><code>{input}</code></td>
                            <td className={`action-cell ${actionType}`}>{action}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className={`result-box ${parseResult.success ? 'success' : 'error'}`}>
                  <strong>{parseResult.success ? '✓ Success' : '✗ Error'}:</strong>
                  <span>{parseResult.success ? 'Input string accepted by the grammar' : 'Input string rejected - syntax error'}</span>
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
