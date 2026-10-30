"""Email the admins get when a member reports an Atlas spot."""
from app.mails.client_mail import MailSubject, get_template


def test_lists_the_spot_what_is_wrong_and_who_reported_it():
    html = get_template(MailSubject.AtlasSpotReported, place_name="Shop", place_city="Paris", place_country="France",
                        issues=["website", "closed"], username="jane", user_email="jane@example.com",
                        comment="Closed since June")

    assert "Shop" in html and "Paris, France" in html and "jane (jane@example.com)" in html
    assert "Website link is dead or outdated" in html and "Permanently closed" in html
    assert "Closed since June" in html


def test_member_text_is_escaped():
    html = get_template(MailSubject.AtlasSpotReported, place_name="<b>Shop</b>", place_city="Paris",
                        place_country="France", issues=["name"], username="jane", user_email="j@example.com",
                        comment="<script>alert(1)</script>")

    assert "<script>" not in html and "&lt;script&gt;" in html
    assert "<b>Shop</b>" not in html
