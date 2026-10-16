import java.util.List;
import java.util.Arrays;
import javax.tools.*;
import com.sun.source.util.JavacTask;

/** Syntax-only parse. Explicitly does not resolve Android APIs or compile an APK. */
public final class ParseJava {
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
        if(compiler==null)throw new IllegalStateException("JDK required");
        DiagnosticCollector<JavaFileObject> diagnostics=new DiagnosticCollector<>();
        try(StandardJavaFileManager files=compiler.getStandardFileManager(diagnostics,null,null)) {
            JavacTask task=(JavacTask)compiler.getTask(null,files,diagnostics,List.of("-proc:none","--release","17"),null,files.getJavaFileObjectsFromStrings(Arrays.asList(args)));
            task.parse();
            for(Diagnostic<? extends JavaFileObject> d:diagnostics.getDiagnostics()) {
                if(d.getKind()==Diagnostic.Kind.ERROR)throw new AssertionError(d.toString());
            }
            System.out.println("PASS syntax-only parse of "+args.length+" Java source files; Android types NOT checked");
        }
    }
}
