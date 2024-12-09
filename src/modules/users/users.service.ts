import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { hashPasswordHelper } from 'src/helpers/util';
import aqp from 'api-query-params';
import mongoose from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  isEmailExist = async (email: string) => {
    const user = await this.userModel.exists({ email: email });
    if (user) return true;
    return false;
  };
  async create(createUserDto: CreateUserDto) {
    const { name, email, password, phone, address, image } = createUserDto;

    //check email exist
    const isExist = await this.isEmailExist(email);
    if (isExist)
      throw new BadRequestException(
        `${email} already exists. Please use another email`,
      );

    //hash password
    const hashPassword = await hashPasswordHelper(password);

    const user = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      phone,
      address,
      image,
    });
    return {
      _id: user.id,
      // user,
      // message: 'This action adds a new user'
    };
  }

  async findAll(query: string, current: number, pageSize: number) {
    const { filter, sort } = aqp(query);
    if (!current) current = 1;
    if (!pageSize) pageSize = 10;
    if (filter.current) delete filter.current;
    if (filter.pageSize) delete filter.pageSize;
    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (+current - 1) * +pageSize;
    const result = await this.userModel
      .find(filter)
      .limit(pageSize)
      .skip(skip)
      .select('-password')
      .sort(sort as any);

    return {
      result,

      totalPages,
    };
  }

  async findOne(_id: string) {
    try {
      if (!mongoose.isValidObjectId(_id)) {
        return await { message: `Invalid ID format: ${_id}` };
      }
      const user = await this.userModel
      .findById({_id})
      .select("-password")
      ;
      if (!user) {
        return { message: `User with ID #${_id} not found` };
      }
      return {
        user,
      };
    } catch (error) {
      throw new Error(`Error while fetching user: ${error.message}`);
    }
  }

async findByEmail (email: string){
  return await this.userModel.findOne({email})

}

  async update(updateUserDto: UpdateUserDto) {
    const { _id, name, phone, address, image } = updateUserDto;
    return await this.userModel.updateOne(
      { _id },
      { name: name, phone: phone, image: image, address: address },
    );
  }

  async remove(_id: string) {
    //check id
    if (mongoose.isValidObjectId(_id)) {
      //delete
      return await this.userModel.deleteOne({ _id });
    } else {
      throw new BadRequestException();
    }
  }
}
