declare module 'safe-eval' {
  function safeEval(code: string, context?: object): any;
  export default safeEval;
}
