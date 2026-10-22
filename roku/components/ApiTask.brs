sub init()
    m.top.functionName = "sendRequest"
end sub

sub sendRequest()
    request = m.top.request
    method = "GET"
    if request.method <> invalid then method = UCase(request.method)

    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetMessagePort(port)
    transfer.SetUrl(AppConfig().apiBase + request.path + QueryString(request.query, transfer))
    transfer.AddHeader("Accept", "application/json")
    transfer.RetainBodyOnError(true)
    transfer.SetRequest(method)

    if method = "GET"
        transfer.AsyncGetToString()
    else
        body = ""
        if request.body <> invalid
            ' A string body is already JSON (see LaunchBody); an AA here would lose its key case.
            if GetInterface(request.body, "ifString") <> invalid then body = request.body else body = FormatJson(request.body)
            transfer.AddHeader("Content-Type", "application/json")
        end if
        transfer.AsyncPostFromString(body)
    end if

    event = wait(15000, port)
    if type(event) <> "roUrlEvent"
        transfer.AsyncCancel()
        m.top.response = { ok: false, status: 0, data: invalid, error: "The multistream server took too long to answer.", id: request.id }
        return
    end if

    code = event.GetResponseCode()
    text = event.GetString()
    data = invalid
    if text <> invalid and text <> "" then data = ParseJson(text)
    if code >= 200 and code < 300
        m.top.response = { ok: true, status: code, data: data, error: "", id: request.id }
    else
        m.top.response = { ok: false, status: code, data: data, error: ResponseError(code, data), id: request.id }
    end if
end sub
