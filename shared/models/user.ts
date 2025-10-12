export interface IUser {
    id: string;
    username: string;
}

// Class User
export class User {
    // Unique identifier for the User type
    private readonly __isFullUser: void | undefined; 

    public id: string;
    public username: string;
    public password: string;

    constructor(id: string, username: string, password: string) {
        this.id = id;
        this.username = username;
        this.password = password;
    }
}

export class UserWithoutPassword {
    // A *DIFFERENT* unique identifier for the UserWithoutPassword type
    private readonly __isPartialUser: void | undefined; 

    public id: string;
    public username: string;

    constructor(id: string, username: string) {
        this.id = id;
        this.username = username;
    }
}