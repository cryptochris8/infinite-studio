' Unit tests for components/lib/helpers.brs, run off the device by roku/tests/roku.test.ts.
' Each failure prints "FAIL: ..." and the run ends with "RESULT passed=N failed=M".

sub Main()
    m.passed = 0
    m.failed = 0

    testItemsToContent()
    testRowsToContent()
    testRestorableRowItem()
    testStack()
    testLaunchBody()
    testDetailActions()
    testLabels()
    testLaunchHint()
    testResponseError()
    testFindProfileIndex()
    testNav()
    testQueryString()
    testWatchlistPath()
    testDetailMeta()

    print "RESULT passed=" + m.passed.toStr() + " failed=" + m.failed.toStr()
end sub

sub check(name as string, actual as dynamic, expected as dynamic)
    if type(actual) = type(expected) or (isString(actual) and isString(expected)) or (isNumber(actual) and isNumber(expected))
        if actual = expected
            m.passed = m.passed + 1
            return
        end if
    end if
    m.failed = m.failed + 1
    print "FAIL: " + name + ": expected [" + describe(expected) + "] got [" + describe(actual) + "]"
end sub

function isString(value as dynamic) as boolean
    return type(value) = "String" or type(value) = "roString"
end function

function isNumber(value as dynamic) as boolean
    t = type(value)
    return t = "Integer" or t = "roInt" or t = "roInteger" or t = "LongInteger" or t = "Float" or t = "Double"
end function

function describe(value as dynamic) as string
    if value = invalid then return "invalid"
    if isString(value) then return value
    if isNumber(value) or type(value) = "Boolean" or type(value) = "roBoolean" then return value.toStr()
    return type(value)
end function

function sampleItem(id as string, title as string) as object
    return { id: id, tmdbId: 1, mediaType: "movie", title: title, description: "d", posterUrl: "http://pi/img/w342/p.jpg", backdropUrl: "", meta: "Movie · 1999" }
end function

sub testItemsToContent()
    parent = ItemsToContent([sampleItem("movie:1", "Heat"), sampleItem("tv:2", "Severance")])
    check("ItemsToContent count", parent.getChildCount(), 2)
    first = parent.getChild(0)
    check("ItemsToContent id", first.id, "movie:1")
    check("ItemsToContent title", first.title, "Heat")
    check("ItemsToContent custom field", first.posterUrl, "http://pi/img/w342/p.jpg")
    check("ItemsToContent meta", first.meta, "Movie · 1999")
    check("ItemsToContent invalid", ItemsToContent(invalid).getChildCount(), 0)
end sub

sub testRowsToContent()
    rows = [
        { title: "Trending", items: [sampleItem("movie:1", "Heat")] },
        { title: "Popular", items: [sampleItem("movie:2", "Ronin"), sampleItem("movie:3", "Thief")] },
    ]
    root = RowsToContent(rows)
    check("RowsToContent rows", root.getChildCount(), 2)
    check("RowsToContent row title", root.getChild(1).title, "Popular")
    check("RowsToContent row items", root.getChild(1).getChildCount(), 2)
    check("RowsToContent item", root.getChild(1).getChild(1).title, "Thief")
    check("RowsToContent invalid", RowsToContent(invalid).getChildCount(), 0)
end sub

sub testLaunchBody()
    watch = { channelId: "13", contentId: "", mediaType: "" }
    text = LaunchBody("192.168.68.53", watch)
    parsed = ParseJson(text)
    check("LaunchBody watch channel", parsed["channelId"], "13")
    check("LaunchBody watch host", parsed["host"], "192.168.68.53")
    check("LaunchBody watch no content", parsed.doesExist("contentId"), false)
    check("LaunchBody keeps channelId case", Instr(1, text, """channelId""") > 0, true)
    trailer = { channelId: "837", contentId: "abc123", mediaType: "shortFormVideo" }
    text = LaunchBody("10.0.0.2", trailer)
    parsed = ParseJson(text)
    check("LaunchBody trailer content", parsed["contentId"], "abc123")
    check("LaunchBody trailer media", parsed["mediaType"], "shortFormVideo")
    check("LaunchBody keeps contentId case", Instr(1, text, """contentId""") > 0, true)
end sub

sub testStack()
    ys = StackDown(80, [70, 40, 0, 100], 10)
    check("StackDown first", ys[0], 80)
    check("StackDown second", ys[1], 160)
    check("StackDown empty item", ys[2], 210)
    check("StackDown skips empty", ys[3], 210)
    check("StackDown none", StackDown(80, [], 10).count(), 0)
    ys = StackUp(480, [70, 40, 100], 10)
    check("StackUp first", ys[0], 250)
    check("StackUp last ends at bottom", ys[2] + 100, 480)
    ys = StackUp(480, [70, 0], 10)
    check("StackUp ignores empty", ys[0], 410)
end sub

sub testRestorableRowItem()
    root = RowsToContent([
        { title: "Trending", items: [sampleItem("movie:1", "Heat")] },
        { title: "Popular", items: [sampleItem("movie:2", "Ronin"), sampleItem("movie:3", "Thief")] },
    ])
    position = RestorableRowItem([1, 1], root)
    check("RestorableRowItem keeps row", position[0], 1)
    check("RestorableRowItem keeps col", position[1], 1)
    check("RestorableRowItem invalid", RestorableRowItem(invalid, root), invalid)
    check("RestorableRowItem empty", RestorableRowItem([], root), invalid)
    check("RestorableRowItem holes", RestorableRowItem([invalid, invalid], root), invalid)
    check("RestorableRowItem row gone", RestorableRowItem([2, 0], root), invalid)
    check("RestorableRowItem col gone", RestorableRowItem([0, 1], root), invalid)
    check("RestorableRowItem negative", RestorableRowItem([-1, 0], root), invalid)
    check("RestorableRowItem not array", RestorableRowItem("0,0", root), invalid)
    check("RestorableRowItem no content", RestorableRowItem([0, 0], invalid), invalid)
end sub

sub testDetailActions()
    details = {
        watch: [
            { label: "Free on Tubi", channelId: "41468", app: "Tubi" },
            { label: "Watch on Netflix", channelId: "12", app: "Netflix" },
        ],
        trailerKey: "abc123",
    }
    actions = DetailActions(details, false)
    check("DetailActions count", actions.count(), 4)
    check("DetailActions first label", actions[0].label, "Free on Tubi")
    check("DetailActions first action", actions[0].action, "watch")
    check("DetailActions first channel", actions[0].channelId, "41468")
    check("DetailActions first app", actions[0].app, "Tubi")
    check("DetailActions trailer action", actions[2].action, "trailer")
    check("DetailActions trailer channel", actions[2].channelId, "837")
    check("DetailActions trailer content", actions[2].contentId, "abc123")
    check("DetailActions save label", actions[3].label, "Add to My List")

    savedActions = DetailActions({ watch: [], trailerKey: "" }, true)
    check("DetailActions no trailer count", savedActions.count(), 1)
    check("DetailActions saved label", savedActions[0].label, "Remove from My List")
    check("DetailActions missing watch", DetailActions({ trailerKey: "" }, false).count(), 1)
end sub

sub testLabels()
    actions = DetailActions({ watch: [{ label: "Free on Tubi", channelId: "41468", app: "Tubi" }], trailerKey: "" }, false)
    labels = ActionLabels(actions)
    check("ActionLabels count", labels.count(), 2)
    check("ActionLabels second", labels[1], "Add to My List")
    content = LabelsToContent(labels)
    check("LabelsToContent count", content.getChildCount(), 2)
    check("LabelsToContent title", content.getChild(0).title, "Free on Tubi")
end sub

sub testLaunchHint()
    watch = { action: "watch", app: "Tubi" }
    check("LaunchHint watch", LaunchHint(watch, "Fight Club"), "Opening Tubi. Search for " + Chr(34) + "Fight Club" + Chr(34) + " there.")
    check("LaunchHint trailer", LaunchHint({ action: "trailer", app: "YouTube" }, "Fight Club"), "Opening the trailer in YouTube...")
end sub

sub testResponseError()
    check("ResponseError offline", ResponseError(0, invalid), "Can't reach the multistream server. Is the Pi on?")
    check("ResponseError curl error", ResponseError(-28, invalid), "Can't reach the multistream server. Is the Pi on?")
    check("ResponseError server message", ResponseError(403, { error: "The TV blocked it." }), "The TV blocked it.")
    check("ResponseError generic", ResponseError(500, invalid), "Something went wrong (500). Try again.")
    check("ResponseError non-object body", ResponseError(502, "oops"), "Something went wrong (502). Try again.")
end sub

sub testFindProfileIndex()
    profiles = [{ id: 1, name: "Family" }, { id: 4, name: "Kids" }]
    check("FindProfileIndex found", FindProfileIndex(profiles, 4), 1)
    check("FindProfileIndex missing", FindProfileIndex(profiles, 9), -1)
    check("FindProfileIndex invalid", FindProfileIndex(invalid, 1), -1)
end sub

sub testNav()
    items = NavItems("Kids")
    check("NavItems count", items.count(), 6)
    check("NavItems profile", items[5].title, "Profile: Kids")
    check("NavIndex home", NavIndex(items, "home"), 1)
    check("NavIndex missing", NavIndex(items, "nope"), -1)
end sub

sub testQueryString()
    escaper = { Escape: function(s as string) as string
            return s.replace(" ", "%20").replace("&", "%26")
        end function }
    check("QueryString sorted and escaped", QueryString({ q: "fight club & more", profile: 3 }, escaper), "?profile=3&q=fight%20club%20%26%20more")
    check("QueryString empty", QueryString({}, escaper), "")
    check("QueryString invalid", QueryString(invalid, escaper), "")
    check("QueryString skips invalid values", QueryString({ a: invalid }, escaper), "")
end sub

sub testWatchlistPath()
    check("WatchlistPath", WatchlistPath(2, "tv", 1396), "/api/profiles/2/watchlist/tv/1396")
end sub

sub testDetailMeta()
    check("DetailMeta both", DetailMeta({ metaLine: "R · Movie", ratingLine: "★ 8.4" }), "R · Movie    ★ 8.4")
    check("DetailMeta no rating", DetailMeta({ metaLine: "R · Movie", ratingLine: "" }), "R · Movie")
    check("DetailMeta only rating", DetailMeta({ metaLine: "", ratingLine: "★ 8.4" }), "★ 8.4")
end sub
