package org.quentingenet.vinylkeeper_back.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;

import java.util.List;

@Entity
@Table(name = "albums")
public class Album {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Size(max = 255)
    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "artist_id")
    private Artist artist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "genre_id")
    private Genre genre;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id")
    private VinylCollection vinylCollection;

    private Integer releaseYear;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    private ConditionEnum coverCondition;

    @Enumerated(EnumType.STRING)
    private ConditionEnum recordCondition;

    @Enumerated(EnumType.STRING)
    private MoodEnum mood;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL)
    private List<Rating> ratings;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL)
    private List<Loan> loans;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL)
    private List<Wishlist> wishlistEntries;

    public Album() {}

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Artist getArtist() {
        return artist;
    }

    public void setArtist(Artist artist) {
        this.artist = artist;
    }

    public Genre getGenre() {
        return genre;
    }

    public void setGenre(Genre genre) {
        this.genre = genre;
    }

    public VinylCollection getCollection() {
        return vinylCollection;
    }

    public void setCollection(VinylCollection collection) {
        this.vinylCollection = collection;
    }

    public Integer getReleaseYear() {
        return releaseYear;
    }

    public void setReleaseYear(Integer releaseYear) {
        this.releaseYear = releaseYear;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ConditionEnum getCoverCondition() {
        return coverCondition;
    }

    public void setCoverCondition(ConditionEnum coverCondition) {
        this.coverCondition = coverCondition;
    }

    public ConditionEnum getRecordCondition() {
        return recordCondition;
    }

    public void setRecordCondition(ConditionEnum recordCondition) {
        this.recordCondition = recordCondition;
    }

    public MoodEnum getMood() {
        return mood;
    }

    public void setMood(MoodEnum mood) {
        this.mood = mood;
    }

    public List<Rating> getRatings() {
        return ratings;
    }

    public void setRatings(List<Rating> ratings) {
        this.ratings = ratings;
    }

    public List<Loan> getLoans() {
        return loans;
    }

    public void setLoans(List<Loan> loans) {
        this.loans = loans;
    }

    public List<Wishlist> getWishlistEntries() {
        return wishlistEntries;
    }

    public void setWishlistEntries(List<Wishlist> wishlistEntries) {
        this.wishlistEntries = wishlistEntries;
    }
}
