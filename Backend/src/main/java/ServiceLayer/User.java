package ServiceLayer;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class User {
    @Id
    int user_id;
    String user_name;

}
