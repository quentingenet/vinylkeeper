import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SpinningNowAlbumCard from "@components/SpinningNow/SpinningNowAlbumCard";
import type { SpinningNowAlbum } from "@models/ISpinningNow";

afterEach(cleanup);

const album: SpinningNowAlbum = {
  id: 1,
  external_album_id: "380980",
  title: "Puccini - Tosca",
  artist_name: "Puccini",
  image_url: null,
  year: 1900,
  genres: ["Classical"],
  styles: ["Opera", "Romantic"],
  moods: ["romantic", "powerful"],
  collections: [{ id: 7, name: "Mine" }, { id: 8, name: "Sundays" }],
};

describe("SpinningNowAlbumCard", () => {
  it("shows the title, artist and deduplicated tags", () => {
    render(<SpinningNowAlbumCard album={album} onPlay={vi.fn()} />);

    expect(screen.getByText("Tosca")).toBeInTheDocument();
    expect(screen.getByText("Puccini")).toBeInTheDocument();
    // "Romantic" is both a style and a mood: shown once
    expect(screen.getAllByText("Romantic")).toHaveLength(1);
    expect(screen.getByText("1900")).toBeInTheDocument();
    expect(screen.getByText("Powerful")).toBeInTheDocument();
  });

  it("shows every collection holding the album", () => {
    render(<SpinningNowAlbumCard album={album} onPlay={vi.fn()} />);

    expect(screen.getByText("In Mine, Sundays")).toBeInTheDocument();
  });

  it("shows no collection line when the list is empty", () => {
    render(<SpinningNowAlbumCard album={{ ...album, collections: [] }} onPlay={vi.fn()} />);

    expect(screen.queryByText(/^In /)).not.toBeInTheDocument();
  });

  it("plays the album on click", async () => {
    const onPlay = vi.fn();
    render(<SpinningNowAlbumCard album={album} onPlay={onPlay} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Play Tosca by Puccini" }));

    expect(onPlay).toHaveBeenCalledWith(album);
  });
});
