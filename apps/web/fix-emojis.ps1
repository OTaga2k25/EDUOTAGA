$f = "c:\Otagaworks\edUOtaga\apps\web\public\experiments\computer\whatisanalgorithm\js\algorithm.js"
$c = [System.IO.File]::ReadAllText($f)

$c = $c.Replace("✅ Correct!", "Correct!")
$c = $c.Replace("❌ Wrong —", "Wrong —")
$c = $c.Replace("✅ SUCCESS", "SUCCESS")
$c = $c.Replace("❌ FAILED", "FAILED")
$c = $c.Replace("✅ DONE", "DONE")
$c = $c.Replace("💡 ", "")
$c = $c.Replace("✅ Good answer!", "Good answer!")
$c = $c.Replace("🟠 Try including", "Try including")
$c = $c.Replace("🟠 Not quite.", "Not quite.")
$c = $c.Replace("🟠 Remember:", "Remember:")
$c = $c.Replace("🟠 Hint:", "Hint:")
$c = $c.Replace("✅ ", "")
$c = $c.Replace("❌ ", "")
$c = $c.Replace("🟠 ", "")

[System.IO.File]::WriteAllText($f, $c)
Write-Host "SUCCESS algorithm.js"

$f2 = "c:\Otagaworks\edUOtaga\apps\web\public\experiments\computer\whatisanalgorithm\index.html"
$c2 = [System.IO.File]::ReadAllText($f2)
$c2 = $c2.Replace("✅ Correct Delivery", "Correct Delivery")
$c2 = $c2.Replace("❌ Wrong Instructions (Wall Crash)", "Wrong Instructions (Wall Crash)")

[System.IO.File]::WriteAllText($f2, $c2)
Write-Host "SUCCESS index.html"
