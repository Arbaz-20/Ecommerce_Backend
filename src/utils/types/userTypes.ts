export type user = {
    id ?:string,
    name:string,
    age:number,
    email:string,
    password:string,
    country:Enumerator,
    type:Enumerator,
    image:string,
    city:string,
    address:string,
    createdAt:Date,
    updatedAt:Date,
}

export type UserType = {
    name:string,
    age:number,
    email:string,
    password:string,
    country:Enumerator,
    type:Enumerator,
    image?:string,
    city:string,
    address:string,
    permission?:string|undefined
}

export type permissionType = {
    create:boolean,
    update:boolean,
    edit:boolean,
    delete:boolean,
    view:boolean,
    userId?:string,
}

export type ErrorStatus = {
    error?:string,
    status?:number
}

export type Fileinfo = {
    fieldname?:string,
    originalname?:string,
    encoding?:string
    mimetype?:string,
    buffer?:Buffer | undefined
}

export type DataInfo = {
    message?:string,
    status?:number
}