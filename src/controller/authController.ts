import AuthServiceImplementation from "../service/implementation/AuthServiceImplementation"
import { Request,Response } from "express"
import { DataInfo,permissionType,UserType,user,ErrorStatus,Fileinfo } from "../utils/types/userTypes"
import PermissionServiceImplementation from "../service/implementation/PermissionServiceImplementation"
import fs from 'fs'
import { Stream,Readable } from "stream"

class AuthController{
    auth_service: AuthServiceImplementation
    permissionService: PermissionServiceImplementation

    public destination: string = "src/utils/upload/user"

    constructor(){
        this.auth_service = new AuthServiceImplementation()
        this.permissionService = new PermissionServiceImplementation()
    }

    public CreateUser = async (req : Request ,res : Response) => {
        let userData = req.body;
        let file:Fileinfo | undefined = req.file as Fileinfo;
        
        if(userData.permission == null || userData.permission == undefined){
            res.status(400).json({ error:"Please provide the permission to user"})
        }
        else{
            if(userData.name == undefined || userData.email == undefined || userData.password == undefined || userData.name == null|| userData.email == null || userData.password == null){
                res.status(400).json({error : "please provide the required fields"})
            }else{
                try {
                    if(file == null || file == undefined){
                        let response = this.createUserData(userData);
                        if((await response).message || (await response).status == 400){
                            res.status((await response).status as number).json({error:(await response).message});    
                        }else{
                            res.status((await response).status as number).json({message:(await response).message});    
                        }
                    }else{
                        if(file.mimetype?.split("/")[1] == "jpg" || file.mimetype?.split("/")[1] == "png" || file.mimetype?.split("/")[1] == "jpeg"){
                            let stream = Readable.from(file.buffer as Buffer);
                            let filePath = `${this.destination}/${file.originalname?.split(".")[0]+"_"+this.getTimeStamp()+"."+file.originalname?.split(".")[1]}`
                            let writer = fs.createWriteStream(filePath);
                            stream.pipe(writer);
                            let url = `${process.env.server}/${filePath}`
                            userData["image"] = url;
                            let response : Promise<{message?:string,status?:number}> = this.createUserData(userData);
                            if((await response).message && (await response).status == 400){
                                res.status(400).json({error:(await response).message})
                            }else{
                                res.status(200).json({message:(await response).message})
                            }
                        }else{
                            res.status(400).json({error:"Please Select either png or jpg or jpeg file"});    
                        }
                        
                            
                    }
                } catch (error:any) {
                    this.print(error);
                    if(error.errors){
                        let validationerror = []
                        for await(let response of error.errors){
                            let obj :{path : string,message : string} = {
                                path: "",
                                message: ""
                            };
                            obj.path = response.path,
                            obj.message = response.message
                            validationerror.push(obj);
                        }
                        res.status(400).json({errors : validationerror});
                    }else{
                        res.status(400).json({errors : error.message});
                    }
                }
            }
        }
    }

    public UpdateUser = async(req : Request,res : Response ) => {
        let userData = req.body;
        let permissionData = JSON.parse(userData["permission"]);
        let {id} = req.params;
        if(id == null || id == undefined){
            res.status(404).json({error : "please provide id to update"})
        }else{
            try{
                let isExist = await this.auth_service.GetUserById(id)
                if(isExist == null ||isExist == undefined){
                    res.status(400).json({error: "please select user properly"})
                }else{
                    let userResponse : object | [affectedCount:number] |any = await this.auth_service.UpdateUser(id,userData);
                    if(userResponse == null || userResponse == undefined){
                        res.status(400).json({error:"Something went wrong please try again"});
                    }
                    else if(userResponse.error || userResponse.status){
                        res.status(userResponse.status).json({error:userResponse.error});
                    }
                    else{
                        if(userResponse > 0){
                            let permission = await this.permissionService.getPermissionByUserId(id);
                            if(permission == null || permission == undefined){
                                permissionData = JSON.parse(JSON.stringify(permissionData));
                                permissionData["userId"] = id;
                                let data = await this.permissionService.CreatePermission(permissionData[0]);
                                if(data !== null || data !== undefined){
                                    res.status(200).json({message:"Updated Successfully"})
                                }else{
                                    res.status(400).json({message:"Cannot update please try again"})
                                }
                            }else{
                                let data = await this.permissionService.UpdatePermissionByUserId(id,permissionData[0]);
                                if(data !== null || data !== undefined){
                                    res.status(200).json({message:"Updated Successfully"})
                                }else{
                                    res.status(400).json({message:"Cannot update please try again"})
                                }
                            }
                        }else{
                            res.status(200).json({message:"Couldnt updated please try again"});
                        }
                        
                    }
                }
            }catch(error : any){
                console.log(error);
                if(error.errors){
                    let validationerror : Array<object> = [];
                    for await(let response of error.errors){
                        let obj:{path : string , message : string}={
                            path: "",
                            message: ""
                        }
                        obj.path = response.path;
                        obj.message = response.message;
                        validationerror.push(obj);
                    }
                    res.status(400).json({errors:validationerror})
                }else{
                    res.status(400).json({errors:error})
                }
            } 
        }
    }

    public GetUserById =async (req : Request,res:Response) => {
        let id = req.params.id;
        if(id == null || id == undefined){
            res.status(404).json({error:"please provide id"})
    }else{
            try {
                let userResponse : user | {error ?:string,status?:number } | null = await this.auth_service.GetUserById(id);
                if(userResponse == null || userResponse == undefined){
                    res.status(400).json({error:"Something went wrong please try again"});
                }
                else{
                    res.status(200).json({data: userResponse});
                }
            } catch (error : any) {
                res.status(400).json({error:error.message});
            }
        }
    }

    public GetAllUsers = async (req : Request,res:Response) => {
        let page = req.query.page as unknown as number;
        let limit = req.query.limit as unknown as number;
        try {
            let userResponse :{count : number,rows:object[]} | {error ?: string ,status?:number } = await this.auth_service.GetAllUsers(Number(page),limit);
            if(userResponse == null || userResponse == undefined || page == undefined || limit == undefined||page == null || limit == null){
                res.status(400).json({error:"Something went wrong please try again"});
            }else{
                res.status(200).json({data : userResponse});
            }
        } catch (error:any) {
            res.status(400).json({error:error.message});
        }
    }

    public DeleteUser =async (req : Request,res:Response) => {
        let id : string = req.params?.id;
        try {
            let userResponse : {error?:string,status?:number} | any | number|undefined = await this.auth_service.DeleteUser(id);
            if(userResponse == null || userResponse == undefined){
                res.status(400).json({error:"Something went wrong please try again"});
            }else if (userResponse.error || userResponse.status == 400){
                res.status(userResponse.status as number).json({error:userResponse.error});
            }else{
                let permissions = await this.permissionService.DeletePermissionByUserId(id)
                if(permissions !=null|| permissions != undefined){
                    res.status(200).json({message:"deleted Sucessfully"});
                }else{
                    res.status(400).json({error:"couldnot able to delete"})
                }
            }
        } catch (error:any) {
            res.status(400).json({error:error.message})
        }
        
    }

    public BulkDeleteUser =async (req : Request,res:Response) => {
        let ids : string[] = req.body.ids;
        let errors: string[] = [];
        let success:string[] = [];
        
        try {
            for await(let id of ids ){
                if(id != null || id != undefined || id != ""){
                    let isExist : user | { error?: string | undefined , status?: number | undefined }|any = await this.auth_service.GetUserById(id);
                    if(isExist !== null || isExist !== undefined){
                        let permission = await this.permissionService.getPermissionByUserId(id);
                        if(permission != null || permission != undefined){
                            let response : number | ErrorStatus|any = await this.permissionService.DeletePermissionByUserId(id);
                            if(response > 0){
                                let response : {error?:string,status?:number}|number = await this.auth_service.DeleteUser(id);
                                if(Number(response) > 0){
                                    success.push(`${isExist.name} Deleted Successfully`);
                                }else{
                                    errors.push(`${isExist.name} cannot be deleted please try again`)
                                }
                            }
                            else{
                                errors.push(`${isExist.name} couldn't Delete plese try again`);
                            }
                        }
                    }
                }
            }
            if(errors.length > 0){
                res.status(400).json({error:errors});
            }else if(errors.length > 0,success.length > 0){
                res.status(400).json({success:success,error:errors});
            }else{
                res.status(200).json({success:success , message:"All Deleted Successfully"});
            }
        } catch (error:any) {
            res.status(400).json({error:error.message})
        }
        
    }

    private print = async(message:string) :Promise< string | void > => {
        return console.log(message);
    }

    private createUserData  = async(userData:UserType):Promise<{message?:string,status?:number}> => {
        let permission:Array<permissionType> = JSON.parse(userData.permission as string)
        let userResponse : user | { error ? : string,status ? : number } | any = await this.auth_service.CreateUser(userData);
        if(userResponse == null || userResponse == undefined){
            return{message:"Something went wrong please try again",status:400};
        }
        else if(userResponse.error || userResponse.status == 400){
            return {message:userResponse.error,status:userResponse.status}
        }else{
            permission[0]["userId"] = userResponse.id;
            let permissionResponse = await this.permissionService.CreatePermission(permission[0])
            if(permissionResponse == null || permissionResponse == undefined){
                return {message:"Something went wrong please try again",status:userResponse.status}
            }else{
                return {message:"Sign Up Sucessfully",status:200}
            }
        }
    }

    private getTimeStamp = () =>{
        return Math.floor(Date.now() / 1000)
    }

} 

export default AuthController

