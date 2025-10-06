export interface IUser {
    id: string;
    username: string;
}

// Class User
export class User {
    // Unique identifier for the User type
    private readonly __isFullUser: void | undefined; 

    constructor(
        public id: string,
        public username: string,
        public password: string
    ) {}
}

export class UserWithoutPassword {
    // A *DIFFERENT* unique identifier for the UserWithoutPassword type
    private readonly __isPartialUser: void | undefined; 

    constructor(
        public id: string,
        public username: string
    ) {}
}