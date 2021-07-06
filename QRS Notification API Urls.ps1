$headers = @{
    '$VirtualProxyHeaderPrefix$' = '$UserName$'
    'x-qlik-xrfkey' = '12345678qwertyui'
    'Content-Type'= 'application/json'
}

$endpoint = """http://$QlikSenseServer$:3000/notify/taskfailure"""
$url = "https://$QlikSenseServer$/$VirtualProxyHeaderPrefix$/qrs/notification?xrfkey=12345678qwertyui&name=ExecutionResult&changeType=2&filter=Status%20eq%208"
Invoke-RestMethod -Method 'Post' -Uri $url -Headers $headers -Body $endpoint
