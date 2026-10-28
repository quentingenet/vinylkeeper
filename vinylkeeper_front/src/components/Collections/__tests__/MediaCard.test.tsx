import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MediaCard from "@components/Collections/MediaCard";

afterEach(cleanup);

describe("MediaCard", () => {
  describe("album title splitting", () => {
    it("splits 'Artist - Title' into two lines", () => {
      render(
        <MediaCard
          item={{ title: "Daft Punk - Discovery" }}
          itemType="album"
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText("Daft Punk")).toBeInTheDocument();
      expect(screen.getByText("Discovery")).toBeInTheDocument();
    });

    it("falls back to showing the full title on both lines when there is no separator", () => {
      render(
        <MediaCard
          item={{ title: "Discovery" }}
          itemType="album"
          onPlay={vi.fn()}
        />
      );

      const matches = screen.getAllByText("Discovery");
      expect(matches).toHaveLength(2);
    });
  });

  describe("artist rendering", () => {
    it("shows the full title on a single line, no second line", () => {
      render(
        <MediaCard
          item={{ title: "Daft Punk" }}
          itemType="artist"
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText("Daft Punk")).toBeInTheDocument();
      // Artist titles are never split on " - ", unlike albums.
      expect(screen.queryByText("Punk")).not.toBeInTheDocument();
    });
  });

  describe("wishlist entity badge", () => {
    it("shows 'Album' for a wishlist album item", () => {
      render(
        <MediaCard
          item={{ title: "Discovery", entity_type: "album" }}
          itemType="wishlist"
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText("Album")).toBeInTheDocument();
    });

    it("shows 'Artist' for a wishlist artist item", () => {
      render(
        <MediaCard
          item={{ title: "Daft Punk", entity_type: "artist" }}
          itemType="wishlist"
          onPlay={vi.fn()}
        />
      );

      expect(screen.getByText("Artist")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onPlay when the card is clicked", async () => {
      const onPlay = vi.fn();
      const user = userEvent.setup();
      render(
        <MediaCard item={{ title: "Daft Punk - Discovery" }} itemType="album" onPlay={onPlay} />
      );

      await user.click(screen.getByText("Daft Punk"));

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it("calls onDelete but not onPlay when the delete button is clicked", async () => {
      const onPlay = vi.fn();
      const onDelete = vi.fn();
      const user = userEvent.setup();
      render(
        <MediaCard
          item={{ title: "Discovery" }}
          itemType="album"
          onPlay={onPlay}
          onDelete={onDelete}
        />
      );

      const buttons = screen.getAllByRole("button");
      // Second icon button is delete (play is first).
      await user.click(buttons[1]);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onPlay).not.toHaveBeenCalled();
    });

    it("does not render a delete button when onDelete is not provided", () => {
      render(<MediaCard item={{ title: "Discovery" }} itemType="album" onPlay={vi.fn()} />);

      expect(screen.getAllByRole("button")).toHaveLength(1);
    });
  });
});

describe("MediaCard copies badge", () => {
  it("shows how many copies the record has", () => {
    render(<MediaCard item={{ title: "Miles Davis - Kind Of Blue", copies_count: 3 }} itemType="album" onPlay={vi.fn()} />);

    expect(screen.getByLabelText("3 copies")).toHaveTextContent("×3");
  });

  it("shows nothing for a single copy", () => {
    render(<MediaCard item={{ title: "Miles Davis - Kind Of Blue", copies_count: 1 }} itemType="album" onPlay={vi.fn()} />);

    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });
});
