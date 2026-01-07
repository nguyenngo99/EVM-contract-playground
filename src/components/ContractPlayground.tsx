import { useState } from 'react'
import { createWalletClient, custom } from 'viem'
import { arbitrum } from 'viem/chains'

interface ContractPlaygroundProps {
  publicClient: any
}

interface ParsedFunction {
  name: string
  type: 'read' | 'write'
  inputs: Array<{ name: string; type: string }>
  outputs: Array<{ name: string; type: string }>
  originalAbi: any
}

function ContractPlayground({ publicClient }: ContractPlaygroundProps) {
  const [contractAddress, setContractAddress] = useState<string>('')
  const [abiInput, setAbiInput] = useState<string>('')
  const [parsedFunctions, setParsedFunctions] = useState<ParsedFunction[]>([])
  const [selectedFunction, setSelectedFunction] = useState<ParsedFunction | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)
  const [txHash, setTxHash] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState<`0x${string}` | null>(null)
  const [walletType, setWalletType] = useState<string | null>(null)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  // Helper function to detect OKX wallet
  const getWalletProvider = () => {
    if (window.okxwallet) {
      return { provider: window.okxwallet, type: 'OKX Wallet' }
    }
    if (window.ethereum && (window.ethereum.isOkxWallet || window.ethereum.isOKXWallet)) {
      return { provider: window.ethereum, type: 'OKX Wallet' }
    }
    if (window.ethereum) {
      return { provider: window.ethereum, type: window.ethereum.isMetaMask ? 'MetaMask' : 'Web3 Wallet' }
    }
    return null
  }

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const walletDetection = getWalletProvider()

      if (!walletDetection) {
        setError('No wallet found. Please install OKX Wallet or another Web3 wallet.')
        return
      }

      setWalletType(walletDetection.type)

      const walletClient = createWalletClient({
        chain: arbitrum,
        transport: custom(walletDetection.provider),
      })

      const [connectedAddress] = await walletClient.requestAddresses()
      setAddress(connectedAddress)

      const chainId = await walletClient.getChainId()

      if (chainId !== arbitrum.id) {
        setError(`Wrong network! Please switch to Arbitrum (chain ID: ${arbitrum.id}). Current chain ID: ${chainId}`)
        return
      }
    } catch (err) {
      console.error('Error connecting wallet:', err)
      setError('Failed to connect wallet. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadContract = () => {
    try {
      setError(null)
      setParsedFunctions([])
      setSelectedFunction(null)
      setResult(null)
      setTxHash('')
      setSimulationResult(null)

      // Validate contract address
      if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        setError('Invalid contract address format. Must be 0x followed by 40 hex characters.')
        return
      }

      // Parse ABI JSON
      let abi: any[]
      try {
        abi = JSON.parse(abiInput)
        if (!Array.isArray(abi)) {
          throw new Error('ABI must be an array')
        }
      } catch  {
        setError('Invalid ABI JSON. Please provide a valid JSON array.')
        return
      }

      // Extract functions from ABI
      const functions = abi.filter((item: any) => item.type === 'function')

      if (functions.length === 0) {
        setError('No functions found in ABI.')
        return
      }

      // Parse functions and categorize as read or write
      const parsed: ParsedFunction[] = functions.map((func: any) => {
        const isRead = func.stateMutability === 'view' || func.stateMutability === 'pure' || func.constant

        return {
          name: func.name,
          type: isRead ? 'read' : 'write',
          inputs: func.inputs || [],
          outputs: func.outputs || [],
          originalAbi: func,
        }
      })

      setParsedFunctions(parsed)
    } catch (err) {
      console.error('Error loading contract:', err)
      setError('Failed to load contract. Please check your inputs.')
    }
  }

  const handleFunctionSelect = (func: ParsedFunction) => {
    setSelectedFunction(func)
    setParamValues({})
    setResult(null)
    setTxHash('')
    setError(null)
    setSimulationResult(null)
  }

  const handleParamChange = (paramName: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [paramName]: value,
    }))
  }

  const executeRead = async () => {
    if (!selectedFunction || !contractAddress) return

    try {
      setIsLoading(true)
      setError(null)
      setResult(null)

      const args = selectedFunction.inputs.map((input) => {
        const value = paramValues[input.name || 'param']
        if (!value) {
          throw new Error(`Missing value for parameter: ${input.name || 'param'}`)
        }

        // Convert value based on type
        if (input.type === 'address' || input.type === 'address payable') {
          return value as `0x${string}`
        } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
          return BigInt(value)
        } else if (input.type === 'bool') {
          return value.toLowerCase() === 'true'
        } else {
          return value
        }
      })

      const response = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: [selectedFunction.originalAbi],
        functionName: selectedFunction.name,
        args,
      })

      setResult(response)
    } catch (err) {
      console.error('Error executing read:', err)
      setError(err instanceof Error ? err.message : 'Failed to execute read call')
    } finally {
      setIsLoading(false)
    }
  }

  const executeWrite = async () => {
    if (!selectedFunction || !contractAddress || !address) {
      setError('Please connect your wallet first.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setTxHash('')

      const walletDetection = getWalletProvider()
      if (!walletDetection) {
        setError('No wallet found. Please connect your wallet.')
        return
      }

      const walletClient = createWalletClient({
        chain: arbitrum,
        transport: custom(walletDetection.provider),
      })

      const args = selectedFunction.inputs.map((input) => {
        const value = paramValues[input.name || 'param']
        if (!value) {
          throw new Error(`Missing value for parameter: ${input.name || 'param'}`)
        }

        if (input.type === 'address' || input.type === 'address payable') {
          return value as `0x${string}`
        } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
          return BigInt(value)
        } else if (input.type === 'bool') {
          return value.toLowerCase() === 'true'
        } else {
          return value
        }
      })

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: [selectedFunction.originalAbi],
        functionName: selectedFunction.name,
        args,
        account: address,
      })

      setTxHash(hash)
      setResult('Transaction submitted successfully!')
    } catch (err) {
      console.error('Error executing write:', err)
      setError(err instanceof Error ? err.message : 'Failed to execute write transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const simulateContract = async () => {
    if (!selectedFunction || !contractAddress || !address) {
      setError('Please connect your wallet first.')
      return
    }

    try {
      setIsSimulating(true)
      setError(null)
      setSimulationResult(null)

      const args = selectedFunction.inputs.map((input) => {
        const value = paramValues[input.name || 'param']
        if (!value) {
          throw new Error(`Missing value for parameter: ${input.name || 'param'}`)
        }

        if (input.type === 'address' || input.type === 'address payable') {
          return value as `0x${string}`
        } else if (input.type.startsWith('uint') || input.type.startsWith('int')) {
          return BigInt(value)
        } else if (input.type === 'bool') {
          return value.toLowerCase() === 'true'
        } else {
          return value
        }
      })

      // Simulate the contract call
      const simulation = await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: [selectedFunction.originalAbi],
        functionName: selectedFunction.name,
        args,
        account: address,
      })

      // Estimate gas
      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress as `0x${string}`,
        abi: [selectedFunction.originalAbi],
        functionName: selectedFunction.name,
        args,
        account: address,
      })

      // Get current gas price
      const gasPrice = await publicClient.getGasPrice()

      setSimulationResult({
        success: true,
        result: simulation.result,
        gasUnits: gasEstimate,
        gasPrice: gasPrice,
        gasCostWei: gasEstimate * gasPrice,
        request: simulation.request,
      })
    } catch (err) {
      console.error('Error simulating contract:', err)
      setSimulationResult({
        success: false,
        error: err instanceof Error ? err.message : 'Simulation failed',
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const formatResult = (res: any): string => {
    if (typeof res === 'bigint') {
      return res.toString()
    } else if (typeof res === 'object' && res !== null) {
      return JSON.stringify(res, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2)
    }
    return String(res)
  }

  return (
    <div className="contract-playground-container">
      <h1>Contract Playground</h1>
      <p className="subtitle">Interact with any smart contract on Arbitrum</p>

      {/* Wallet Connection */}
      <div className="wallet-section">
        {!address ? (
          <button className="connect-button" onClick={connectWallet} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="wallet-info">
            <p>Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
            {walletType && <p className="wallet-type">Wallet: {walletType}</p>}
          </div>
        )}
      </div>

      {/* Contract Input Section */}
      <div className="contract-input-section">
        <div className="input-group">
          <label>Contract Address:</label>
          <input
            type="text"
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            className="contract-input"
          />
        </div>

        <div className="input-group">
          <label>Contract ABI (JSON):</label>
          <textarea
            placeholder='[{"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address"}],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]'
            value={abiInput}
            onChange={(e) => setAbiInput(e.target.value)}
            className="abi-textarea"
            rows={8}
          />
        </div>

        <button className="load-button" onClick={loadContract}>
          Load Contract
        </button>
      </div>

      {/* Function List */}
      {parsedFunctions.length > 0 && (
        <div className="functions-section">
          <h3>Available Functions ({parsedFunctions.length})</h3>
          <div className="functions-list">
            {parsedFunctions.map((func) => (
              <div
                key={func.name}
                className={`function-item ${selectedFunction?.name === func.name ? 'selected' : ''} ${func.type}`}
                onClick={() => handleFunctionSelect(func)}
              >
                <div className="function-header">
                  <span className="function-name">{func.name}</span>
                  <span className={`function-type ${func.type}`}>{func.type}</span>
                </div>
                <div className="function-signature">
                  <span className="params">
                    {func.inputs.map((input, i) => (
                      <span key={i} className="param">
                        {input.type} {input.name}
                        {i < func.inputs.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                  <span className="returns">
                    {func.outputs.length > 0 && ` ⇒ ${func.outputs[0].type}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Function Execution */}
      {selectedFunction && (
        <div className="function-execution">
          <h3>Execute: {selectedFunction.name}</h3>
          <p className="function-type-badge">{selectedFunction.type.toUpperCase()}</p>

          <div className="parameters-section">
            {selectedFunction.inputs.map((input, index) => (
              <div key={index} className="param-input-group">
                <label>
                  {input.name || `param${index}`} ({input.type}):
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${input.type} value`}
                  value={paramValues[input.name || `param${index}`] || ''}
                  onChange={(e) => handleParamChange(input.name || `param${index}`, e.target.value)}
                  className="param-input"
                />
              </div>
            ))}
          </div>

          <div className="execution-buttons">
            {selectedFunction.type === 'read' ? (
              <button
                className="execute-button read"
                onClick={executeRead}
                disabled={isLoading}
              >
                {isLoading ? 'Reading...' : 'Read'}
              </button>
            ) : (
              <>
                <button
                  className="execute-button simulate"
                  onClick={simulateContract}
                  disabled={isSimulating || !address}
                >
                  {isSimulating ? 'Simulating...' : 'Simulate'}
                </button>
                <button
                  className="execute-button write"
                  onClick={executeWrite}
                  disabled={isLoading || !address}
                >
                  {isLoading ? 'Writing...' : 'Write'}
                </button>
              </>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {/* Simulation Results */}
          {simulationResult && (
            <div className={`result-section ${simulationResult.success ? 'simulation-success' : 'simulation-error'}`}>
              <h4>Simulation Result</h4>
              {simulationResult.success ? (
                <div className="simulation-details">
                  <p className="status success">✓ Transaction would succeed</p>
                  <div className="gas-info">
                    <p><strong>Gas Estimate:</strong> {simulationResult.gasUnits.toString()} units</p>
                    <p><strong>Gas Price:</strong> {parseFloat(simulationResult.gasPrice.toString()) / 1e9} Gwei</p>
                    <p><strong>Estimated Cost:</strong> {parseFloat(simulationResult.gasCostWei.toString()) / 1e18} ETH</p>
                  </div>
                  {simulationResult.result && (
                    <div className="simulation-return">
                      <strong>Return Value:</strong>
                      <pre className="result-display">{formatResult(simulationResult.result)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="simulation-error-details">
                  <p className="status error">✗ Transaction would fail</p>
                  <p className="error-message">{simulationResult.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {result && !txHash && (
            <div className="result-section">
              <h4>Result:</h4>
              <pre className="result-display">{formatResult(result)}</pre>
            </div>
          )}

          {txHash && (
            <div className="result-section">
              <h4>Transaction Submitted:</h4>
              <p className="tx-hash">Hash: {txHash}</p>
              <a
                href={`https://arbiscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View on Arbiscan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ContractPlayground
