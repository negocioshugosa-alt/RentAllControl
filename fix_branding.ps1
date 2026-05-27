Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw -Encoding UTF8
    if ($content -match 'RentFlow|rentflow') {
        $newContent = $content -replace 'RentFlow', 'RentAllControl' -replace 'rentflow', 'rentallcontrol'
        [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "Updated: $file"
    }
}
Write-Host "Done."
