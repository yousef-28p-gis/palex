import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) return null;
    
    // إذا تم تمرير مفتاح، أرجع قيمة محددة فقط
    if (data) {
      return user[data];
    }
    
    return user;
  },
);