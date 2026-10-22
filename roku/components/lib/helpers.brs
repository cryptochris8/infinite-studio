' Pure helpers shared by the screens. They avoid device-only objects so they can be unit tested
' off the device (see roku/tests).

' The YouTube app's Roku channel ID; trailers open there.
function YouTubeChannelId() as string
    return "837"
end function

' One ContentNode per item from the Pi's Roku feed, as children of a new parent node.
function ItemsToContent(items as object) as object
    parent = CreateObject("roSGNode", "ContentNode")
    if items = invalid then return parent
    for each item in items
        node = parent.createChild("ContentNode")
        node.update(item, true)
    end for
    return parent
end function

' RowList content: a root node holding one node per row, each holding the row's items.
function RowsToContent(rows as object) as object
    root = CreateObject("roSGNode", "ContentNode")
    if rows = invalid then return root
    for each row in rows
        rowNode = root.createChild("ContentNode")
        rowNode.title = row.title
        for each item in row.items
            node = rowNode.createChild("ContentNode")
            node.update(item, true)
        end for
    end for
    return root
end function

' The detail screen's buttons, in order: each watch option, the trailer, then My List.
' A RowList position [row, col] that still exists in content, or invalid. The RowList can report
' an empty or partial position before it has ever been focused.
function RestorableRowItem(position as dynamic, content as object) as dynamic
    if position = invalid or content = invalid then return invalid
    if GetInterface(position, "ifArray") = invalid or position.count() <> 2 then return invalid
    row = position[0]
    col = position[1]
    if row = invalid or col = invalid then return invalid
    if row < 0 or row >= content.getChildCount() then return invalid
    if col < 0 or col >= content.getChild(row).getChildCount() then return invalid
    return [row, col]
end function

' Y positions that stack items of these heights downward from top, gap apart. Empty items
' (height 0) take no space, so a missing line doesn't leave a hole.
function StackDown(top as integer, heights as object, gap as integer) as object
    ys = []
    y = top
    for each h in heights
        ys.push(y)
        if h > 0 then y = y + h + gap
    end for
    return ys
end function

' Like StackDown, but the last item ends at bottom.
function StackUp(bottom as integer, heights as object, gap as integer) as object
    total = 0
    count = 0
    for each h in heights
        if h > 0
            total = total + h
            count = count + 1
        end if
    end for
    if count > 1 then total = total + gap * (count - 1)
    return StackDown(bottom - total, heights, gap)
end function

' The JSON body for POST /api/roku/launch. It's encoded here because an AA passed through a
' node field comes out with lowercase keys, and the Pi expects "channelId".
function LaunchBody(host as string, action as object) as string
    body = { "host": host, "channelId": action.channelId }
    if action.contentId <> "" then body["contentId"] = action.contentId
    if action.mediaType <> "" then body["mediaType"] = action.mediaType
    return FormatJson(body)
end function

function DetailActions(details as object, saved as boolean) as object
    actions = []
    if details.watch <> invalid
        for each option in details.watch
            actions.push({ label: option.label, action: "watch", app: option.app, channelId: option.channelId, contentId: "", mediaType: "" })
        end for
    end if
    if details.trailerKey <> invalid and details.trailerKey <> ""
        actions.push({ label: "Play trailer", action: "trailer", app: "YouTube", channelId: YouTubeChannelId(), contentId: details.trailerKey, mediaType: "shortFormVideo" })
    end if
    if saved
        actions.push({ label: "Remove from My List", action: "save", app: "", channelId: "", contentId: "", mediaType: "" })
    else
        actions.push({ label: "Add to My List", action: "save", app: "", channelId: "", contentId: "", mediaType: "" })
    end if
    return actions
end function

' LabelList content with one row per label.
function LabelsToContent(labels as object) as object
    parent = CreateObject("roSGNode", "ContentNode")
    for each label in labels
        node = parent.createChild("ContentNode")
        node.title = label
    end for
    return parent
end function

' The labels of a list of actions, for LabelsToContent.
function ActionLabels(actions as object) as object
    labels = []
    for each action in actions
        labels.push(action.label)
    end for
    return labels
end function

' What to tell the viewer before another app opens. Roku can't open a specific title in another
' app, so for streaming services they need to search for it there.
function LaunchHint(action as object, title as string) as string
    if action.action = "trailer" then return "Opening the trailer in YouTube..."
    return "Opening " + action.app + ". Search for " + Chr(34) + title + Chr(34) + " there."
end function

' A readable message for a failed request to the Pi.
function ResponseError(code as integer, data as dynamic) as string
    if code <= 0 then return "Can't reach the multistream server. Is the Pi on?"
    if type(data) = "roAssociativeArray" and data.error <> invalid then return data.error
    return "Something went wrong (" + code.toStr() + "). Try again."
end function

' Position of the profile with this ID, or -1.
function FindProfileIndex(profiles as object, profileId as integer) as integer
    if profiles = invalid then return -1
    for i = 0 to profiles.count() - 1
        if profiles[i].id = profileId then return i
    end for
    return -1
end function

' The left-hand menu: what each entry says and which screen it opens.
function NavItems(profileName as string) as object
    return [
        { title: "Search", target: "search" },
        { title: "Home", target: "home" },
        { title: "Movies", target: "movies" },
        { title: "Shows", target: "shows" },
        { title: "My List", target: "mylist" },
        { title: "Profile: " + profileName, target: "profiles" },
    ]
end function

' Position of a screen in the menu, or -1.
function NavIndex(items as object, target as string) as integer
    for i = 0 to items.count() - 1
        if items[i].target = target then return i
    end for
    return -1
end function

' "?a=1&b=two" from an associative array, escaping values with escaper.Escape(). On the device the
' escaper is a roUrlTransfer. Keys are sorted so the result is predictable.
function QueryString(params as object, escaper as object) as string
    if params = invalid then return ""
    keys = params.keys()
    if keys.count() = 0 then return ""
    keys.sort()
    parts = []
    for each key in keys
        value = params[key]
        if value <> invalid
            if type(value) <> "String" and type(value) <> "roString" then value = value.toStr()
            parts.push(key + "=" + escaper.Escape(value))
        end if
    end for
    if parts.count() = 0 then return ""
    return "?" + parts.join("&")
end function

' The API path for adding a title to, or removing it from, a profile's list.
function WatchlistPath(profileId as integer, mediaType as string, tmdbId as integer) as string
    return "/api/profiles/" + profileId.toStr() + "/watchlist/" + mediaType + "/" + tmdbId.toStr()
end function

' The meta line under a title on the detail screen: "R · Movie · 1999 · 2h 19m    ★ 8.4".
function DetailMeta(details as object) as string
    meta = details.metaLine
    if details.ratingLine <> invalid and details.ratingLine <> ""
        if meta <> "" then meta = meta + "    "
        meta = meta + details.ratingLine
    end if
    return meta
end function
