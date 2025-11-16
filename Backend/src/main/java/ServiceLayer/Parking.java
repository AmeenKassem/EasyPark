package ServiceLayer;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Parking {
    String location;
    double price;
    String type; //Sunny or not
    @Id
    private Long id;


    public void setId(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }
}
