import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录接口入参
 * 用于后台用户名/密码登录。
 */
export class LoginDto {
  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MaxLength(100)
  username: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MaxLength(128)
  password: string;
}

/**
 * 刷新 token 接口入参
 * 用于凭 refresh token 换取新的 access token。
 */
export class RefreshTokenDto {
  @ApiProperty({ description: '刷新 token' })
  @IsString()
  @IsNotEmpty({ message: 'refreshToken 不能为空' })
  refreshToken: string;
}
