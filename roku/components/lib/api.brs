' Device-side helpers for talking to the Pi. Requests run in an ApiTask so the screen never waits.

' Starts a request and calls `callback` (the name of a sub taking the field event) with the
' response: { ok, status, data, error, id }. Keep the returned task in m so it isn't released early.
function StartRequest(request as object, callback as string) as object
    task = CreateObject("roSGNode", "ApiTask")
    task.request = request
    task.observeField("response", callback)
    task.control = "RUN"
    return task
end function

' This Roku's own address on the home network, so the Pi can ask it to open another app.
function DeviceIp() as string
    addresses = CreateObject("roDeviceInfo").GetIPAddrs()
    for each name in addresses
        return addresses[name]
    end for
    return ""
end function

' The profile this Roku used last time, or -1.
function ReadSavedProfileId() as integer
    section = CreateObject("roRegistrySection", "multistream")
    if section.Exists("profileId") then return section.Read("profileId").toInt()
    return -1
end function

sub SaveProfileId(profileId as integer)
    section = CreateObject("roRegistrySection", "multistream")
    section.Write("profileId", profileId.toStr())
    section.Flush()
end sub

' Shows a short message at the bottom of the screen.
sub ShowToast(message as string)
    m.top.getScene().toast = message
end sub

' Places labels one under another by their drawn height, so a one-line title doesn't leave a gap.
' anchor "top" starts at y; "bottom" makes the last label end at y.
sub StackLabels(labels as object, y as integer, gap as integer, anchor as string)
    heights = []
    for each label in labels
        if label.text = "" then heights.push(0) else heights.push(Int(label.boundingRect().height))
    end for
    if anchor = "bottom" then ys = StackUp(y, heights, gap) else ys = StackDown(y, heights, gap)
    for i = 0 to labels.count() - 1
        labels[i].translation = [labels[i].translation[0], ys[i]]
    end for
end sub
