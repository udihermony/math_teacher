"use client";

import { useMemo } from "react";

interface P5SandboxProps {
  code: string;
  height?: number;
}

export function P5Sandbox({ code, height = 400 }: P5SandboxProps) {
  const srcdoc = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; display: flex; justify-content: center; }
  canvas { display: block; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.3/p5.min.js"></script>
</head>
<body>
<script>
try {
  ${code}
} catch(e) {
  document.body.innerHTML = '<pre style="color:red;padding:16px;font-size:12px;">Error: ' + e.message + '</pre>';
}
</script>
</body>
</html>`,
    [code]
  );

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="w-full rounded-lg border border-border bg-white"
      style={{ height }}
      title="p5.js animation"
    />
  );
}
