# CodeRush execution API test suite (run while `npm run dev` AND the
# self-hosted execution service are active).
#
#   node scripts/mock-piston.mjs        # or a real self-hosted Piston on :2000
#   npm run dev
#   powershell -File scripts/test-execute.ps1
#
$ErrorActionPreference = "Continue"
$results = @()

function Test-Execute($name, $payload) {
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:3000/api/code/execute" `
            -Method Post -ContentType "application/json" -Body $payload
        return @("=== $name ===", ($res | ConvertTo-Json -Depth 5 -Compress))
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $body = ""
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
        } catch {}
        return @("=== $name (HTTP $status) ===", $body)
    }
}

# ---- Happy paths: all four languages ---------------------------------------
$results += Test-Execute "javascript-hello" '{"language":"javascript","code":"console.log(\"CodeRush JavaScript works!\");","input":""}'
$results += Test-Execute "python-hello" '{"language":"python","code":"print(\"CodeRush Python works!\")","input":""}'
$results += Test-Execute "cpp-hello" '{"language":"cpp","code":"#include <iostream>\nusing namespace std;\nint main() {\n    cout << \"CodeRush C++ works!\" << endl;\n    return 0;\n}\n","input":""}'
$results += Test-Execute "java-hello" '{"language":"java","code":"public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"CodeRush Java works!\");\n    }\n}\n","input":""}'

# ---- stdin support ----------------------------------------------------------
$results += Test-Execute "javascript-stdin-sum" '{"language":"javascript","code":"const fs = require(\"fs\");\nconst input = fs.readFileSync(0, \"utf8\").trim().split(/\\s+/).map(Number);\nconsole.log(input[0] + input[1]);","input":"10\n20"}'
# STDIN_ECHO makes the service echo stdin back as stdout (plumbing check).
$results += Test-Execute "python-stdin-passthrough" '{"language":"python","code":"# STDIN_ECHO\nprint(\"x\")","input":"10\n20"}'

# ---- Java class-name auto-detection (non-Main public class) -----------------
$results += Test-Execute "java-custom-class-name" '{"language":"java","code":"public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from HelloWorld\");\n    }\n}\n","input":""}'

# ---- Error states ------------------------------------------------------------
$results += Test-Execute "cpp-compile-error" '{"language":"cpp","code":"// COMPILE_ERROR\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << oops << endl;\n    return 0;\n}\n","input":""}'
$results += Test-Execute "python-runtime-error" '{"language":"python","code":"print(undefined_name)","input":""}'
$results += Test-Execute "javascript-syntax-error" '{"language":"javascript","code":"console.log(\"unclosed","input":""}'
$results += Test-Execute "timeout-infinite-loop" '{"language":"javascript","code":"while(true){}","input":""}'

# ---- Output edge cases --------------------------------------------------------
$results += Test-Execute "empty-output" '{"language":"python","code":"x = 1 + 1","input":""}'
$results += Test-Execute "large-output" '{"language":"python","code":"# LARGE_OUTPUT\nprint(\"ignored\")","input":""}'

# ---- Request validation ---------------------------------------------------------
$results += Test-Execute "invalid-language" '{"language":"ruby","code":"puts 1","input":""}'
$results += Test-Execute "empty-code" '{"language":"python","code":"","input":""}'
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/code/execute" -Method Post `
        -ContentType "application/json" -Body "{not json"
    $results += "=== malformed-json: UNEXPECTED SUCCESS ==="
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    $results += "=== malformed-json (HTTP $status) ==="
}

$results | Set-Content -Path "$PSScriptRoot\test-results.txt" -Encoding UTF8
Write-Output "Done. Results written to scripts/test-results.txt"