"""CSV of the exports: a cell typed by a member never becomes a formula in a spreadsheet."""
import pytest

from app.utils.csv_export import spreadsheet_safe, stream_csv


@pytest.mark.parametrize("value", ["=HYPERLINK(\"http://x\")", "+1", "-M- - Mister Mystère", "@SUM(A1)", "\tx", "\rx"])
def test_a_cell_read_as_a_formula_is_kept_as_text(value):
    assert spreadsheet_safe(value) == f"'{value}"


@pytest.mark.parametrize("value", ["", "Daft Punk", "1977", "Sofa Records - Paris"])
def test_other_cells_are_left_as_they_are(value):
    assert spreadsheet_safe(value) == value


async def test_the_file_neutralises_every_cell():
    response = stream_csv("x.csv", iter([["Title", "Artist"], ["=cmd|' /C calc'!A0", "Ok"]]))

    content = b"".join([chunk async for chunk in response.body_iterator]).decode("utf-8")

    assert content == "﻿Title;Artist\r\n'=cmd|' /C calc'!A0;Ok\r\n"
    assert response.headers["content-disposition"] == 'attachment; filename="x.csv"'
