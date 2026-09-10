$urls = @{
    "missing_crossing.jpg" = "https://images.pexels.com/photos/1000654/pexels-photo-1000654.jpeg?auto=compress&cs=tinysrgb&w=800";
    "missing_signboard.jpg" = "https://images.pexels.com/photos/1684880/pexels-photo-1684880.jpeg?auto=compress&cs=tinysrgb&w=800";
    "incident_hit_and_run.jpg" = "https://images.pexels.com/photos/1756957/pexels-photo-1756957.jpeg?auto=compress&cs=tinysrgb&w=800"
}

foreach ($k in $urls.Keys) {
    try {
        $dest = "frontend/public/images/alerts/" + $k
        Invoke-WebRequest -Uri $urls[$k] -OutFile $dest -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        $len = (Get-Item $dest).Length
        Write-Host "[SUCCESS] $k : $len bytes"
    } catch {
        Write-Host "[FAIL] $k : $($_.Exception.Message)"
    }
}
