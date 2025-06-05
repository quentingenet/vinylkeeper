package org.quentingenet.vinylkeeper_back.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "artists")
public class Artist {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "name", unique = true, length = 255)
    private String name;
    
    @Column(name = "country", length = 100)
    private String country;
    
    @Column(name = "biography", columnDefinition = "TEXT")
    private String biography;
    
    @OneToMany(mappedBy = "artist")
    private List<Album> albums;

    public Artist() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getBiography() {
        return biography;
    }

    public void setBiography(String biography) {
        this.biography = biography;
    }

    public List<Album> getAlbums() {
        return albums;
    }

    public void setAlbums(List<Album> albums) {
        this.albums = albums;
    }
}