$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskSource=[IO.Path]::GetFullPath((Join-Path $taskRoot 'native/build/RewiredCRT.ofx.bundle'))
$taskDestination=[IO.Path]::GetFullPath('C:/Program Files/Common Files/OFX/Plugins/RewiredCRT.ofx.bundle')
$taskLog=Join-Path $taskRoot 'releases/install-ofx.log'
$taskBackup=[IO.Path]::GetFullPath((Join-Path $taskRoot ('releases/ofx-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))))
try {
 if(Get-Process Resolve -ErrorAction SilentlyContinue){throw 'Please close DaVinci Resolve before updating the plugin.'}
 if(-not(Test-Path -LiteralPath (Join-Path $taskSource 'Contents/Win64/RewiredCRT.ofx'))){throw 'Built plugin missing'}
 $taskCount=0
 foreach($taskFile in Get-ChildItem -LiteralPath $taskSource -Recurse -File){
  $taskRelative=$taskFile.FullName.Substring($taskSource.Length).TrimStart('\','/')
  $taskTarget=[IO.Path]::GetFullPath((Join-Path $taskDestination $taskRelative))
  if(-not $taskTarget.StartsWith($taskDestination+[IO.Path]::DirectorySeparatorChar)){throw 'Target outside bundle'}
  $taskDifferent=$true
  if(Test-Path -LiteralPath $taskTarget){
   $taskDifferent=(Get-FileHash -LiteralPath $taskTarget).Hash -ne (Get-FileHash -LiteralPath $taskFile.FullName).Hash
   if($taskDifferent){
    $taskBackupFile=[IO.Path]::GetFullPath((Join-Path $taskBackup $taskRelative))
    if(-not $taskBackupFile.StartsWith($taskBackup+[IO.Path]::DirectorySeparatorChar)){throw 'Backup outside backup directory'}
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($taskBackupFile)) -Force | Out-Null
    Copy-Item -LiteralPath $taskTarget -Destination $taskBackupFile
    if((Get-FileHash -LiteralPath $taskTarget).Hash -ne (Get-FileHash -LiteralPath $taskBackupFile).Hash){throw 'Backup verification failed'}
   }
  }
  if($taskDifferent){
   New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($taskTarget)) -Force | Out-Null
   Copy-Item -LiteralPath $taskFile.FullName -Destination $taskTarget -Force
  }
  if((Get-FileHash -LiteralPath $taskFile.FullName).Hash -ne (Get-FileHash -LiteralPath $taskTarget).Hash){throw "Hash mismatch: $taskRelative"}
  $taskCount++
 }
 "SUCCESS: $taskCount files verified in $taskDestination; replaced files backed up in $taskBackup" | Set-Content -LiteralPath $taskLog
 exit 0
}catch{
 "FAILED: $($_.Exception.Message); backup location: $taskBackup" | Set-Content -LiteralPath $taskLog
 exit 1
}
