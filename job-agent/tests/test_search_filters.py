from bosshunter.scraper.jobs import _company_size_excluded, _hr_is_active


def test_hr_is_active_matches_online_keywords():
    assert _hr_is_active("刚刚活跃", None)
    assert _hr_is_active("今日活跃", None)
    assert _hr_is_active("1小时内活跃", None)
    assert _hr_is_active("在线", None)


def test_hr_is_inactive_returns_false():
    assert not _hr_is_active("3日内活跃", None)
    assert not _hr_is_active("", None)
    assert not _hr_is_active("未知", ["刚刚活跃"])


def test_company_size_excluded_when_matched():
    assert _company_size_excluded("10000人以上", ["10000人以上"])
    assert _company_size_excluded("1000-9999人", ["10000人以上", "1000-9999人"])


def test_company_size_allowed_when_not_excluded():
    assert not _company_size_excluded("100-499人", ["10000人以上"])
    assert not _company_size_excluded("100-499人", [])
